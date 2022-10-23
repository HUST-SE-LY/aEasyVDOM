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
    const key=props.key;
    let text=null;
    children=children?children:[];
    for(i in children) {
      if(typeof children[i]==='string') {
        text=children[i];
        break;
      }
    }
    children=children.filter((child)=>{
      return typeof child!=='string';
    })
    return createElement(tagName,props,children,key,text);
  },
};

class Node {
  constructor(tagName, props, children,key,innerText) {
    //加上KEY便于后续遍历
    this.el=null;//对应其真实dom
    this.tagName = tagName;
    this.props = props;
    this.innerText=innerText?innerText:null;
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

    if(this.innerText) {
      tag.innerText=this.innerText
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
    this.setEl(tag);
    return tag;//返回dom元素
  }

  setEl(dom) {//对应真实dom
    this.el=dom;
  }
}


function createElement(tagName, props, children, key,text) {
  let node = new Node(tagName, props, children, key,text);
  return node;
}


function render(element, node) {
  //传入的两个都是Dom元素，第一个用于挂载，第二个是Node.render()生成的
  element.replaceWith(node);
  return node;
}

function patch(oldVnode,newVnode) {
  if(oldVnode.tagName===newVnode.tagName&&oldVnode.key===newVnode.key) {//就继续遍历下去
    patchVnode(oldVnode,newVnode)


  } else {
    const el=oldVnode.el;
    el.replaceWith(newVnode.render());
    newVnode.setEl(el);//替换节点
  }

  return newVnode;


}

function patchVnode(oldVnode,newVnode) {
  const el=newVnode.el=oldVnode.el;
  if(newVnode===oldVnode) {
    return ;
  }
  if(newVnode.innerText&&oldVnode.innerText&&oldVnode.innerText!==newVnode.innerText) {
    el.innerText=newVnode.innerText;
  }
  if(newVnode.children.length&&oldVnode.children.length&&newVnode.children!==oldVnode.children) {
    updateProps(el,newVnode.props,oldVnode.props);
    updateChildren(el,newVnode.children,oldVnode.children);
  } else if(newVnode.children.length) {
    for(let child of newVnode.children) {
      child.setEl(el.appendChild(child.render()));
    }
  } else if(oldVnode.children.length) {
    for(let child of el.children) {
      el.removeChild(child);
    }
  }


}

function updateProps(el,newprops,oldprops) {
  for (let attrName in oldprops) {//遍历旧属性并与新属性对比，记录属性的更新和删除
    if (!newprops.hasOwnProperty(attrName)) {
      el.removeAttribute(attrName);
    } else if (newprops[attrName] !== oldprops[attrName]) {
      el.setAttribute(attrName,newprops[attrName]);
    }
  }

  for (let attrName in newprops) {//遍历新属性，记录属性的增加
    if (!oldprops.hasOwnProperty(attrName)) {
      el.setAttribute(attrName,newprops[attrName]);
    }
  }

}


function updateChildren(parentEl,newChildren,oldChildren) {
  let oldStartId=0;
  let oldEndId=oldChildren.length-1;
  let oldNodeStart=oldChildren[oldStartId];
  let oldNodeEnd=oldChildren[oldEndId];
  let newStartId=0;
  let newEndId=newChildren.length-1;
  let newNodeStart=newChildren[newStartId];
  let newNodeEnd=newChildren[newEndId];
  let oldKeyMap;
  let oldNodeofKey;
  let elToMove;
  let before;
  while(oldStartId<=oldEndId&&newEndId>=newStartId) {
    if(oldNodeStart==null) {//在key值对应查找时被设置成了null,直接跳过
      oldNodeStart=oldChildren[--oldStartId];
    } else if(oldNodeEnd==null) {//同上，直接跳过
      oldNodeEnd=oldChildren[--oldEndId];
    } else if(oldNodeStart.tagName===newNodeStart.tagName&&oldNodeStart.key===newNodeStart.key) {
      patchVnode(oldNodeStart,newNodeStart);
      oldNodeStart=oldChildren[--oldStartId];
      newNodeStart=newChildren[++newStartId];
    } else if(oldNodeEnd.tagName===newNodeEnd.tagName&&oldNodeEnd.key===newNodeEnd.key) {
      patchVnode(oldNodeEnd,newNodeEnd);
      oldNodeEnd=oldChildren[--oldEndId];
      newNodeEnd=newChildren[--newEndId];
    } else if(oldNodeStart.tagName===newNodeEnd.tagName&&oldNodeStart.key===newNodeEnd.key) {
      patchVnode(oldNodeStart,newNodeEnd);
      parentEl.insertBefore(oldNodeStart.el,oldNodeEnd.el.nextSibling);
      oldNodeStart=oldChildren[++oldStartId];
      newNodeEnd=newChildren[--newEndId];
    } else if(oldNodeEnd.tagName===newNodeStart.tagName&&oldNodeEnd.key===newNodeStart.key) {
      patchVnode(oldNodeEnd,newNodeStart);
      parentEl.insertBefore(oldNodeEnd.el,oldNodeStart.el);
      oldNodeEnd=oldChildren[--oldEndId];
      newNodeStart=newChildren[++newStartId];
    } else {
      if(!oldKeyMap) {
        oldKeyMap=initialKeyMap(oldChildren,oldStartId,oldEndId);
      }
      if(oldKeyMap.has(newNodeStart.key)) {
        elToMove=oldChildren[oldKeyMap.get(newNodeStart.key)];//获取到key值对应的元素,即要移动的元素
        if(newNodeStart.tagName===elToMove.tagName) {//说明子节点存在key和tag都相等的元素，移动
          patchVnode(elToMove,newNodeStart);
          oldChildren[oldKeyMap.get(newNodeStart.key)]=null;
          parentEl.insertBefore(elToMove.el,oldNodeStart.el);
        } else {//否则当成不同元素，说明有新增
          parentEl.insertBefore(newNodeStart.render(),oldNodeStart.el);
        }
        newNodeStart=newChildren[++newStartId];

      } else {//有不同元素，新增
        parentEl.insertBefore(newNodeStart.render(),oldNodeStart.el);
        newNodeStart=newChildren[++newStartId];
      }
    }
  }
  if(oldStartId>oldEndId) {//old先走完，说明有新增
    before=newChildren[newEndId+1]==null?null:newChildren[newEndId+1].render();//确定一个边界，从newStartId到newEndId之间的元素会被插入到before之前
    for(;newStartId<=newEndId;newStartId++) {
      if(newChildren[newStartId]) {
        parentEl.insertBefore(newChildren[newStartId].render(),before);
      }
    }
  } else {//new先走完，说明需要删除
    for(;oldStartId<=oldEndId;oldStartId++) {
      if(oldChildren[oldStartId]) {
        parentEl.removeChild(oldChildren[oldStartId].el)
      }
    }

  }

}

function initialKeyMap(children,begin,end) {
  let map=new Map();
  for(let i = begin;i<=end;i++) {
    if(children[i]) {
      let key = children[i].key;
      map.set(key,i);
    }
  }
  return map;

}


