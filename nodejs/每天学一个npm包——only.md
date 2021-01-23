# 每天学一个npm包——only
<a href="https://www.npmjs.com/package/only">only</a>是一个npm包，用于从某个对象中取出部分指定的属性，它接受一个由属性组成的数组或者空格分隔的字符串作为参数，返回一个新的对象。

only在koa的各个主模块中均有应用，用于自定义各个对模块的toJSON方法.

本人经常用到的与only类似的场景是【导出表格】功能，导出表格时，如果表格的表头是动态的，就需要我们从数据中取出部分属性值进行导出。

### 一、使用方法
only的API非常简单直观：

```js
var obj = {
  name: 'tobi',
  last: 'holowaychuk',
  email: 'tobi@learnboost.com',
  _id: '12345'
};

var user = only(obj, 'name last email'); //字符串形式
```
你也可以使用数组形式：

```js
var user = only(obj, ['name', 'last', 'email']);
```

输出：

```js
{
  name: 'tobi',
  last: 'holowaychuk',
  email: 'tobi@learnboost.com'
}
```

### 二、实现原理
only的原理非常简单，就是从对象中取部分属性，我们最容易想到的可能类似如下方式：

	function only (obj, keys = []) {
		if (typeof keys === 'string') {
			 keys = keys.split(/ +/);
		}
		let obj = {}
		for (let key of keys) {
			obj[key] = obj[key]
		}
		return obj
	}
	
only采用了一个另外一种方式，它借用了reduce辅助方法，也是一种比较巧妙的方法了：

	module.exports = function(obj, keys){
	    obj = obj || {};
	    if ('string' == typeof keys) keys = keys.split(/ +/);
	         return keys.reduce(function(ret, key){
	         if (null == obj[key]) return ret;
	    	  ret[key] = obj[key];
	         return ret;
	    }, {});
	};