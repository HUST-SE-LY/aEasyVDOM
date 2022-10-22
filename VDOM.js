const patchStyle = {
  NODE_DELETE: 0,//节点被删除
  NODE_ADD: 1,//节点被添加
  NODE_REPLACE: 2,//节点被替代
  PROPS_DELETE: 3,//属性被删除
  PROPS_ADD: 4,//属性被添加
  PROPS_REPLACE: 5,//属性被替换
  TEXT_REPLACE: 6,//文本被替换
};

const React = {
  createElement(tagName, props, ...children) {
    props=props?props:{};
    const key=props.key?props.key:'_No_KEY';
    children=children?children:[];
    return createElement(tagName,props,children,key);
  },
};

class Node {
  constructor(tagName, props, children, key) {
    //加上KEY便于后续遍历
    this.tagName = tagName;
    this.props = props;
    this.children = children ? children : []; //chidlren要么是Node数组要么是字符串要么是空
    this.key =props.key?props.key: key;
  }
  render(parent) {
    //传入一个父节点
    let tag = document.createElement(this.tagName); //创建节点

    for (let attrName in this.props) {
      //给节点增加属性
      tag.setAttribute(attrName, this.props[attrName]);
    }

    for (let childNode of this.children) {
      if (childNode instanceof Node) {
        childNode.render(tag); //递归渲染
      } else {
        tag.appendChild(document.createTextNode(childNode)); //字符串就创建文字节点
      }
    }
    if (parent) {
      parent.appendChild(tag); //将当前节点置于父节点下
    }
    return tag;
  }
}


function createElement(tagName, props, children, key) {
  let node = new Node(tagName, props, children, key);
  return node;
}
function render(element, node) {
  //传入的两个都是Dom元素，第一个用于挂载，第二个是Node.render()生成的
  element.replaceWith(node);
  return node;
}
function diff(oldTree, newTree) {
  //查找两棵节点树的差异
  const index = {
    value: 0,
  }; //代表节点位置
  let patches = []; //补丁是一个二维数组
  dfs(oldTree, newTree, index, patches); //深度优先搜索查找两棵树差异并生成补丁
  return patches; //返回生成的补丁
}

function dfs(oldNode, newNode, index, patches) {
  patches[index.value] = []; //存放当前节点的差异
  if (newNode == null) {
    //当前位置更新后不存在节点，说明节点被删除
    patches[index.value].push({
      type: patchStyle.NODE_DELETE,
    });
  } else if (typeof oldNode === "string" && typeof newNode === "string") {
    //这一步判断必须写在上面防止下面的遍历获取到了字符
    if (oldNode !== newNode) {
      patches[index.value].push({
        type: patchStyle.TEXT_REPLACE,
        value: newNode,
      });
    }
  } else if (
    oldNode.tagName === newNode.tagName &&
    oldNode.key === newNode.key
  ) {
    //如果名字和key都一样则没有更改，接着查看属性差异，直接遍历子节点
    diffProps(oldNode.props, newNode.props, index, patches);
    diffChildren(oldNode.children, newNode.children, index, patches);
  } else {
    //剩下的情况直接更新节点
    patches[index.value].push({
      type: patchStyle.NODE_REPLACE,
      value: newNode,
    });
  }
}

function diffProps(oldprops, newprops, index, patches) {
  //对比每个节点的属性
  for (let attrName in oldprops) {//遍历旧属性并与新属性对比，记录属性的更新和删除
    if (!newprops.hasOwnProperty(attrName)) {
      patches[index.value].push({
        type: patchStyle.PROPS_DELETE,
        value: attrName,
      });
    } else if (newprops[attrName] !== oldprops[attrName]) {
      patches[index.value].push({
        type: patchStyle.PROPS_REPLACE,
        name: attrName,
        value: newprops[attrName],
      });
    }
  }

  for (let attrName in newprops) {//遍历新属性，记录属性的增加
    if (!oldprops.hasOwnProperty(attrName)) {
      patches[index.value].push({
        type: patchStyle.PROPS_ADD,
        name: attrName,
        value: newprops[attrName],
      });
    }
  }
}

function diffChildren(oldChildren, newChildren, index, patches) {
  let currentPosition = index.value;
  if (oldChildren.length < newChildren.length) {
    //子节点变多，说明有子节点被增加
    let i = 0;
    while (i < oldChildren.length) {
      //先遍历没被增加的节点
      index.value++;
      dfs(oldChildren[i], newChildren[i], index, patches);
      i++;
    }
    while (i < newChildren.length) {
      //遍历增加的节点，直接添加至补丁
      patches[currentPosition].push({
        type: patchStyle.NODE_ADD,
        value: newChildren[i],
      });
      i++;
    }
  } else {
    //说明要么没增加要么删除了节点
    let i = 0;
    while (i < oldChildren.length) {
      index.value++;
      dfs(oldChildren[i], newChildren[i], index, patches);
      i++;
    }
  }
}

function patch(node, patches) {//应用补丁，传入dom节点
  const index = {
    value: 0,
  };
  const _node=JSON.parse(JSON.stringify(node));
  dfsUpdate(node, patches, index);//开始dfs,因为patches也是由dfs生成，和dfsdom树的顺序一样，因此同步应用即可
  return node;
}

function dfsUpdate(node, patches, index, end) {
  let isDeleted=false;
  if (!patches[index.value]) {
    return;
  }
  if (patches[index.value].length > 0) {
    patches[index.value].forEach((difference) => {//对节点的处理方法
      switch (difference.type) {
        case patchStyle.NODE_ADD:
          node.appendChild(difference.value.render());
          break;
        case patchStyle.NODE_DELETE:
          node.remove();
          isDeleted=true;
          break;
        case patchStyle.NODE_REPLACE:
          node.replaceWith(difference.value.render());
          break;
        case patchStyle.PROPS_ADD:
          node.setAttribute(difference.name, difference.value);
          break;
        case patchStyle.PROPS_DELETE:
          node.removeAttribute(difference.value);
          break;
        case patchStyle.PROPS_REPLACE:
          node.setAttribute(difference.name, difference.value);
          break;
        case patchStyle.TEXT_REPLACE:
          node.innerText = difference.value;
          break;
      }
    });
  }

  if (end) {
    return;
  }

  if(isDeleted) {
    return "delete"
  }

  if (node.children.length > 0) {
    for (let i = 0; i < node.children.length; i++) {
      index.value++;
      if(dfsUpdate(node.children[i], patches, index)==="delete") {
        i--;
      };
    }
  } else if(node.innerText) {//dom元素无法通过children获取到文本节点
    index.value++;
    dfsUpdate(node, patches, index, true);
  }
}

