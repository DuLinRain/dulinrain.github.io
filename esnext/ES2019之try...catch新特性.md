# ES2019之try...catch新特性
通常我们在写try...catch语法时，通常都会像类似于下面这样写：

	try {
	  doSomethingThatMightThrow();
	} catch (exception) {
	  //     ^^^^^^^^^
	  // 即使我们后面不使用exception参数，我们也必须写他，否则会报错
	  handleException();
	}
	
通常我们的catch都必须绑定一个参数，即使我们后面不使用exception参数，我们也必须写它，否则会报错，例如：
	
![](https://mmbiz.qpic.cn/mmbiz_png/XsgEbl9Edmm2ZkLaOp7zGzibib2GaiaStMeJicBN9d1WcKjibjg8rNIqRHibNcpQFwx7cZcI4kspAPxmdZ3KKCOqI4VA/0?wx_fmt=png)
	
从ES2019开始，catch可以不再必须有这个参数了，甚至连括号都不用了。这在你不需要使用这个error对象的时候非常有帮助，如：

![](https://mmbiz.qpic.cn/mmbiz_png/XsgEbl9Edmm2ZkLaOp7zGzibib2GaiaStMeQQwYxU4GWhEPQcUgxBxTMpX5M0edlUYpx0gH8hJhBsgdaXj8Xss8rQ/0?wx_fmt=png)

可以查看[TC39](https://tc39.es/proposal-optional-catch-binding/)的文档观察差异：

![](https://mmbiz.qpic.cn/mmbiz_png/XsgEbl9Edmm2ZkLaOp7zGzibib2GaiaStMeia5o1JTvHSEvsJNickpWOzFcTlJ2ZXHVm935I1ypJrW0oeicEh4SBnYQg/0?wx_fmt=png)


### 支持范围

![](https://mmbiz.qpic.cn/mmbiz_png/XsgEbl9Edmm2ZkLaOp7zGzibib2GaiaStMemaKlN9yKwBkqMZ1c4AgkGjzrRbaS0XMt0p6PFVOzy2D2DSqkLn0t4A/0?wx_fmt=png)
