深入理解ES6 Proxy

什么是ES6 Proxy

proxy是ES6引入的一个非常有趣的特性。简而言之，你可以使用一个`Proxy`来决定 `target` 对象的属性被访问时的行为。可以使用 `handle` 对象来配置`Proxy`的捕获行为，我们接下来会讲到。

默认情况下，`proxy`什么都不会做。 如果handle只是个空对象，没有配置任何陷阱(trap)，那么你的 `Proxy` 只是原封不动的把操作传递给了 `target`。 如下：

	var target = {}
	var handler = {}
	var proxy = new Proxy(target, handler)
	proxy.a = 'b'
	console.log(target.a)
	// <- 'b'
	console.log(proxy.c === undefined)
	// <- true
	
我们可以通过给handle添加陷阱来让我们的proxy变得更有趣。 


get 陷阱  用于捕获所有的属性访问

	var handler = {
	  get (target, key) {
	    console.info(`Get on property "${key}"`)
	    return target[key]
	  }
	}
	var target = {}
	var proxy = new Proxy(target, handler)
	proxy.a = 'b'
	proxy.a
	// <- 'Get on property "a"'
	proxy.b
	// <- 'Get on property "b"'

set 陷阱  用于捕获所有的属性设置


可撤销的(revocable) Proxy 

	var target = {}
	var handler = {}
	var {proxy, revoke} = Proxy.revocable(target, handler)
	proxy.a = 'b'
	console.log(proxy.a)
	// <- 'b'
	revoke()
	revoke()
	revoke()
	console.log(proxy.a)
	// <- TypeError: illegal operation attempted on a revoked proxy
	
返回值多了个revoke，一旦revoke被调用，target将不再被代理，不能继续通过proxy操作target.

除get set 陷阱外， Proxy还有一些其它的陷阱：

- has 捕获in操作符
- deleteproperty 捕获 delete 操作
- defineProperty 捕获 Object.defineProperty
- enumerate 捕获 for ... in 循环
- ownKeys 捕获Object.keys
- apply 捕获apply



