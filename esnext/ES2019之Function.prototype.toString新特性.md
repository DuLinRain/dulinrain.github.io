# ES2019之Function.prototype.toString新特性
ES2019对Function.prototype.toString()做了修订，它会准确的返回实际的代码，包括函数名和括号之间的空格以及注释，下面是修订前后的对比：

	//  `function` 关键字和函数名之间的注释以及空格不会输出
	function /* a comment */ foo () {}
	
	// 旧:
	foo.toString();
	// → 'function foo() {}'
	//             ^ no comment
	//                ^ no space
	
	// 新:
	foo.toString();
	// → 'function /* comment */ foo () {}'
	
### 兼容性

![](https://mmbiz.qpic.cn/mmbiz_png/XsgEbl9Edml5CkJNH0TJ8cNX8TiaBoyCobIo6AQfyRSpFKUdOmLoulsYfFY4pwlAExEbP8WjxSw03QxPOqQRMqQ/0?wx_fmt=png)