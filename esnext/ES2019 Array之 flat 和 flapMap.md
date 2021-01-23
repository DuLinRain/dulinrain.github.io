# ES2019 Array之 flat 和 flapMap
ES2019 **`Array`**提供了**`2`**个新方法：**`Array.prototype.flat`** 和 **`Array.prototype.flatMap`**，下面分别讲一下这2个方法的使用场景。

### Array.prototype.flat([depth])
**`Array.prototype.flat`**用于将嵌套数组进行扁平化。举个例子：

	const array = [1, [2, [3]]];
	//            ^^^^^^^^^^^^^ outer array
	//                ^^^^^^^^  inner array
	//                    ^^^   innermost array
	
上面这个数组有多层嵌套关系，一层嵌套一层。**`Array.prototype.flat`**可以将上述嵌套数组进行扁平化：

	array.flat();
	// → [1, 2, [3]]
	
默认的深度是**`1`**，所以上述代码等价于：

	// …is equivalent to:
	array.flat(1);
	// → [1, 2, [3]]
	
而如果想将数组所有层级都扁平化，可以传递**`Infinity`**参数：

	// Flatten recursively until the array contains no more nested arrays:
	array.flat(Infinity);
	// → [1, 2, 3]
	
至于为什么这个方法不叫**`Array.prototype.flatten`**，可以查阅这篇文章（https://developers.google.com/web/updates/2018/03/smooshgate）。

### Array.prototype.flatMap
**`Array.prototype.flatMap`**的使用场景可以从下面这个例子来描述：

	const duplicate = (x) => [x, x];
	
	[2, 3, 4].map(duplicate);
	// → [[2, 2], [3, 3], [4, 4]]
	
由上面这么个**`duplicate`**函数，数组**`[2, 3, 4]`**使用这个方法map后得到的会是一个嵌套数组。为了将这样的数组扁平化，我们可以这么做：

	[2, 3, 4].map(duplicate).flat(); // 🐌
	// → [2, 2, 3, 3, 4, 4]

但是这样显得冗余，而这样的模式在实际场景中又非常常见，所以才有了**`Array.prototype.flatMap`**方法：

	[2, 3, 4].flatMap(duplicate); // 🚀
	// → [2, 2, 3, 3, 4, 4]

### 兼容性

![](https://mmbiz.qpic.cn/mmbiz_png/XsgEbl9EdmmzvE4SSAXpPTf4ibcibotL5JHTrV6TacHmicaGKc8A4DkOnIIOXrfpNtzqtjtTDzGX7TjiaqKDzFcWsw/0?wx_fmt=png)



