# ES2019之字符串trimStart和trimEnd

**ES2019** 引入了 **`String.prototype.trimStart()`** 和 **`String.prototype.trimEnd()`** 两个方法用于**`trim`**字符串:

	const string = '  hello world  ';
	string.trimStart();
	// → 'hello world  '
	string.trimEnd();
	// → '  hello world'
	string.trim(); // ES5
	// → 'hello world'
	
实际上，在**`String.prototype.trimStart()`** 和 **`String.prototype.trimEnd()`**之前，也可以使用**`trimLeft()`**和**`trimRight()`**， 但他们都不是ECMA规范。现在他们会作为 **`trimStart`** 和 **`trimEnd`** 的别名用于后向兼容。也就是说，如果你在**`ES2019`**及之后调用 **`trimLeft()`** 和 **`trimRight()`**，实际调用的是**`trimStart()`**和**`trimEnd()`**：

	const string = '  hello world  ';
	string.trimStart();
	// → 'hello world  '
	string.trimLeft();
	// → 'hello world  '
	string.trimEnd();
	// → '  hello world'
	string.trimRight();
	// → '  hello world'
	string.trim(); // ES5
	// → 'hello world'
	
# 兼容性
![](https://mmbiz.qpic.cn/mmbiz_png/XsgEbl9Edml5CkJNH0TJ8cNX8TiaBoyCoqD2NiclRVClicc81ACeOyXyVOKdv4KIOBBleabicyVCQd8EcZDU873ccA/0?wx_fmt=png)
