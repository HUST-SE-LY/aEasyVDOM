# aEasyVDOM
一个简单的VDOM库的实现以及附带一个测试用例

### 使用方法
- `createElement(tagName:string,props:object,children:array,key:string)`：创建一个node节点
- `render(dom,node.render())`:将dom替换成vdom生成的dom
- `diff(node1,node2)`:对比两个node节点，返回补丁
- `patch(dom,patches)`:将补丁应用到dom树上

详细内容见代码

使用的测试例均是使用vdom生成的[测试例](https://hust-se-ly.github.io/aEasyVDOM/)
