//vdom更新实现打字效果
function addAni(node,time) {
  const text=node.children[0];
  console.log(text)
  const nodeOrigin=document.querySelector(`.${node.props.class}`);
  let i = 1;
  const interval=setInterval(()=>{
    const node1=createElement(node.tagName,node.props,[text.substr(0,i)],node.key);
    patch(nodeOrigin,diff(node,node1))
    node=node1;
    i++;
    if(i>text.length) {
      clearInterval(interval)
    }
  },time)
}