# 原型污染（Prototype Pollution）原理和案例分析

原型污染是一种影响Javascript的漏洞。原型污染指的是攻击者利用某种手段在JavaScript构造原型（如对象）上注入属性的行为。JavaScript允许所有的对象属性被修改，这其中包括一些魔法属性如`__proto__`, `constructor` 和 `prototype`。攻击者操作这些属性，进行重写或者污染基础对象。`Object.prototype`上的属性被所有经过该原型链的对象所继承。这种情况发生后，可能导致拒绝服务攻击（通过触发JavaScript异常）或者远程代码执行。


### 原型污染的原理
在讲具体的CASE之前，我们先了解一下原型污染的原理。简单来说原型污染就是改变`Object.prototype`，比如改变上面已有的Javascript内置方法，如`toString`，`constructor`等，或者是在它上面定义业务用到过的方法，从而实现覆盖。那要怎么才能改变`Object.prototype`呢？这就涉及到原型链的概念了。我们知道任意对象的祖先原型都是`Object.prototype`，而我们可以从任意后代通过魔法属性`__proto__`访问到它。比如：

	class A {}
	var a = new A()
	a.__proto__ == A.prototype
	a.__proto__.__proto__ == A.prototype.__proto__ == Object.prototype
	
	// 或者
	var a = {}
	a.__proto__ == Object.prototype
	
所以很容易看到，要想在`Object.prototype`上造成污染，基本上代码都需要符合如下模式：

	obj[a][b] = value // 其中攻击者可以控制a和value
	
其中假如攻击者可以控制`a`和`value`。想象一下，假如攻击者可以将`a`设置成`__proto__`，这样相当于就是：

	obj.__proto__.b = value
	// 即
	Object.prototype.b = value
	
这样其实就导致攻击者在`Object.prototype`上种下了一个`b`属性，导致所有的对象都会有这个`b`属性。假设`b`是`toString`，而你的代码又依赖`toString`的话，那你`toString`将会被攻击者定义的`toString`覆盖。

另外一种稍微复杂的模式就是：

	obj[a][b][c] = value // 其中攻击者可以控制a，b和value
	
其中攻击者可以控制`a`, `b`和`value`。想象一下，如果攻击者将`a`设置成`constructor`，`b`设置成`prototype`，那么相当于执行的就是如下逻辑：

	obj.constructor.prototype = value
	// 即Object.prototype
	
`obj.constructor.prototype` 实际上就是`Object.prototype`。比如：

	class A{}
	var a = new A()
	a.constructor.prototype == A.prototype
	A.prototype.__proto__ == Object.prototype
	
	// 或
	var a = {}
	a.constructor.prototype == Object.prototype
	
> 注意：上面可能以及涉及到了，就是如果污染的对象不是Object原型，也可以通过多层`__proto__`,即`__proto__.__proto__`来往原型链向上查找到Object。



### 原型污染的常见场景     
有2种比较常见的出现原型污染的场景：

- 不安全的对象递归merge
- 通过路径定义属性

### 不安全的对象递归遍历
递归`merge`的基本逻辑和伪代码如下：

	merge (target, source)
	
	  foreach property of source
	
	    if property exists and is an object on both the target and the source
	
	      merge(target[property], source[property])
	
	    else
	
	      target[property] = source[property]
	      
那有人就会说了，这不是我们常用的深拷贝对象的套路么，怎么就存在问题了？实际上这里恰恰就符合我们前面所讲的那种模式:

	obj[a][b] = value
	
举个例子，比如下面是递归实现的深拷贝:

	function deepClone (source, target) {
	  if (!target || typeof target !== 'object') {
	    return;
	  }
	  if (target instanceof RegExp) {
	    return;
	  }
	  
	  for (let key of Object.keys(target)) {
	    if (source[key] && typeof target[key] === 'object' && typeof source[key] === 'object') {
	      source[key] = deepClone(source[key], target[key])
	    } else {
	      source[key] = target[key]
	    }
	  }
	  return source
	}
	
执行如下测试case:

	var a = {name: 10}, b = {"__proto__": {toSting: 'haha'}}
	deepClone(a, b)
	
咋一看，理论上，这样应该就能够在Object的原型上改变`toString`的定义了。但是！！！实际上这样并不可以。为什么呢?

这是因为，`__proto__`这个魔法属性实际上是只是个`getter和setter`，即只是个存取描述符，读/写`__proto__`时内部分别调用的是`getPrototypeOf/setPrototypeOf`。`getPrototypeOf`很好理解，比如`class A{}  a.__proto__` 相当于就是获取`a`的原型，即`A.prototype`。
`a.__proto__ = {key: val}`(即写)的时候相当于打断原型链，重新设置`a`的原型，并不是在`a`上设置属性。这里的`__proto__`是不可枚举的，`hasOwnProperty`也查不到。比如：

	var a = {age: 1, __proto__: {}}
	[...Object.keys(a)] // ["age"]
	
要想变成可枚举的，变成和我们普通定义的属性一样，必须使用`Object.defineProperty`整一整：

	Object.defineProperty(a, "__proto__", {configurable: true, enumerable: true})
	[...Object.keys(a)] // ["age", "__proto__"]
	
但是，很多情况下，我们能控制的并不是一个直接的对象，所以直接使用`Object.defineProperty`改是不太可能的。
但是有另外一种比较特殊的场景，我们同样可以定义`__proto__`。就是在`JSON.parse`的时候：

	[...Object.keys(JSON.parse('{"age":10, "__proto__":"hahha"}'))]
	// ["age", "__proto__"]
	
而我们的日常业务接受一个JSON字符串作为输入非常普遍。所以这是一个比较好的利用方式。还有的是利用提交的`key`是`__proto__`来利用。

#### 真实案例
在[highcharts<9.0.0](https://github.com/highcharts/highcharts/blob/v8.2.2/ts/Core/Utilities.ts)版本中有这么一段深拷贝的代码：

![](https://github.com/DuLinRain/pictures/blob/master/prototype_pollution/prototype_pollution_1.png?raw=true)

和我们上面的形式几乎一模一样，所以也不幸中招了。在[highcharts>=9.0.0](https://github.com/highcharts/highcharts/blob/v9.0.0/ts/Core/Utilities.ts)中已经进行了修复：

![](https://github.com/DuLinRain/pictures/blob/master/prototype_pollution/prototype_pollution_2.png?raw=true)

### 通过路径定义属性
另外一种容易导致原型污染的场景就是「**通过路径定义属性**」。有少量一些JavaScript库会基于给定的路径使用API往对象上定义属性。这种case常见的语法模式是：

	theFunction(object, path, value)

如果攻击者可以控制这里的`path`参数，那么他们可以设置这个值为`__proto__.myValue`。`myValue`则被定义到原型链上了。

#### 真实案例
下面是[joint.js](https://resources.jointjs.com/docs/jointjs/v3.2/joint.html#util.setByPath)中的一个真实案例，它提供了一个函数，用于根据路径设置对象属性：

	export const setByPath = function(obj, path, value, delimiter) {
	    const keys = Array.isArray(path) ? path : path.split(delimiter || '/');
	    const last = keys.length - 1;
	    let diver = obj;
	    let i = 0;
	
	    for (; i < last; i++) {
	        const key = keys[i];
	        const value = diver[key];
	        // diver creates an empty object if there is no nested object under such a key.
	        // This means that one can populate an empty nested object with setByPath().
	        diver = value || (diver[key] = {});
	    }
	
	    diver[keys[last]] = value;
	
	    return obj;
	};
	
这种情况下，如果你输入下面的路径，那就会造成原型污染：

	const jointjs = require("jointjs");
	
	const obj = {};
	console.log("Before : " + obj.polluted);
	jointjs.util.setByPath({ }, '__proto__/polluted', "yes", '/');
	// jointjs.util.setByPath({ }, 'constructor/prototype/polluted', "yes", '/');
	console.log("After : " + obj.polluted);
	
[joint.js](https://resources.jointjs.com/docs/jointjs/v3.2/joint.html#util.setByPath)后来做了修复，修复方式如下：

	export const setByPath = function(obj, path, value, delimiter) {
	    const keys = Array.isArray(path) ? path : path.split(delimiter || '/');
	    const last = keys.length - 1;
	    let diver = obj;
	    let i = 0;
	
	    for (; i < last; i++) {
	        const key = keys[i];
	        if (!isGetSafe(diver, key)) return obj;
	        const value = diver[key];
	        // diver creates an empty object if there is no nested object under such a key.
	        // This means that one can populate an empty nested object with setByPath().
	        diver = value || (diver[key] = {});
	    }
	
	    diver[keys[last]] = value;
	
	    return obj;
	};
	
`isGetSafe`辅助函数的定义如下：

	const isGetSafe = function(obj, key) {
	    // Prevent prototype pollution
	    // https://snyk.io/vuln/SNYK-JS-JSON8MERGEPATCH-1038399
	    if (key === 'constructor' && typeof obj[key] === 'function') {
	        return false;
	    }
	    if (key === '__proto__') {
	        return false;
	    }
	    return true;
	};
	
### 原型污染的常见危害
原型污染带来的常见危害如下：

- **拒绝服务（DoS）**。有的人可能会想，DoS不是通常是发生在Server端的吗？原型污染这种JS的也会导致？是的，并且这是原型污染最可能带来的危害。一方面JS也有用在服务端的，另一方面，即使是纯前端，原型污染也可以导致前端页面完全不可用。原型污染导致的DoS通常发生在`Object`对象持有的一些方法被隐式地调用（如`toString` 和 `valueOf`）。攻击者可以污染`Object.prototype.someattr`并改变它的值为一个程序非预期的，如`Int` 或 `Object`，这样可能导致程序无法正常工作，从而造成DoS。

> 例如将`Object.prototype.toString`改成了`int`值，这样会导致`someobject.toString()`失败。

- **远程代码执行（RCE）**。这个好像更有点出乎意料哈。原型污染导致的原创代码执行通常发生在代码程序执行了对象上的一个特殊属性。
比如：`eval(someobject.someattr)` 。在这种情况下，如果攻击者污染了`Object.prototype.someattr` ，那这段逻辑就可能导致原创代码执行。
- **属性注入**。攻击者污染代码库依赖的属性，这些属性可能表示用户权限或信息，如cookie或者token。比如，如果一个程序通过`someuser.isAdmin`来检查权限，攻击者污染了`Object.prototype.isAdmin`然后设置其值为`true`，这样他们可能就会获得管理员特权。

### 如何防范原型污染
 防范原型污染通常有如下方式：
 
- 冻结原型。使用`Object.freeze` (`Object.prototype`)。
- 对JSON输入进行校验。NPM仓库里有很多可以用来做
- 避免使用不规范的递归。即使使用也要严格检查`key`。不能是`__proto__`和`constructor`。
- 考虑使用不带原型的对象，从而打断原型链。如`Object.create(null)`。
- 使用`Map`替换`Object`。


### 参考
- [Arteau, Oliver. “JavaScript prototype pollution attack in NodeJS application.” GitHub, 26 May 2018](https://github.com/HoLyVieR/prototype-pollution-nsec18/blob/master/paper/JavaScript_prototype_pollution_attack_in_NodeJS.pdf)         