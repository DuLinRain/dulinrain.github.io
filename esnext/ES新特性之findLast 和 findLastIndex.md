# ES新特性之findLast 和 findLastIndex
findLast 和 findLastIndex用于从后往前获取数组元素。
### 从前往后查找元素
在 **Array** 中查找满足某些条件的元素是一项常见任务，可以通过 **Array.prototype** 和各种 **TypedArray** 原型上的 `find` 和 `findIndex` 方法完成。 `Array.prototype.find` 接受一个函数并返回数组中该函数返回 `true` 的第一个元素。如果函数没有为任何元素返回 `true`，则该方法返回 `undefined`。

	const inputArray = [{v:1}, {v:2}, {v:3}, {v:4}, {v:5}];
	inputArray.find((element) => element.v % 2 === 0);
	// → {v:2}
	inputArray.find((element) => element.v % 7 === 0);
	// → undefined
	
`Array.prototype.findIndex `的工作原理类似，不同之处在于它在找到时返回索引，在未找到时返回 `-1`。 `find` 和 `findIndex` 的 `TypedArray` 版本完全相同，唯一的区别是它们对 `TypedArray` 实例而不是 `Array` 实例进行操作。

	inputArray.findIndex((element) => element.v % 2 === 0);
	// → 1
	inputArray.findIndex((element) => element.v % 7 === 0);
	// → -1
	
### 从后往前查找元素

如果要查找 `Array` 中的最后的某个元素怎么办？这种用例通常会很自然地出现，例如选择对多个匹配项进行重复数据删除以支持最后一个元素，或者提前知道该元素可能接近 `Array` 的末尾。使用 `find` 方法，一种解决方案是首先反转输入，如下所示：

	inputArray.reverse().find(predicate)

但是，`reverse`是变异算法，它会直接改变 `inputArray` 本身，这通常会不符而预期。

而有了`findLast`和`findLastIndex`方法，这个case可以直接并符合常理地解决。它们和他们的另一半`find`  和 `findIndex` 用法完全一样，除了从后往前查找。


	const inputArray = [{v:1}, {v:2}, {v:3}, {v:4}, {v:5}];
	inputArray.findLast((element) => element.v % 2 === 0);
	// → {v:4}
	inputArray.findLast((element) => element.v % 7 === 0);
	// → undefined
	inputArray.findLastIndex((element) => element.v % 2 === 0);
	// → 3
	inputArray.findLastIndex((element) => element.v % 7 === 0);
	// → -1

### 浏览器支持

![](https://github.com/DuLinRain/pictures/blob/master/esnext/findLast&findLastIndex.png?raw=true)

### 参考

- [原文：Finding elements in Arrays and TypedArrays](https://v8.dev/features/finding-in-arrays)




