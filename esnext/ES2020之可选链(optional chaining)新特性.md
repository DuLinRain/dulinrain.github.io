# ES2020之可选链(optional chaining)新特性

在JavaScript中，通常会有较长的属性访问，这些属性访问常常是通过链式进行的。 但是当其中一个出现undefined或null（undefined或null在英文里通常称为**`nullish值`**）的时候的时候，很容易会抛出错误，导致程序异常，比如：

	const nameLength = db.user.name.length;

一种比较常见的解决方式是使用比较长或者比较深的if语句来实现：

	let nameLength;
	if (db && db.user && db.user.name) {
	  nameLength = db.user.name.length;
	}
	
另一种方式是使用三元运算符来实现：

	const nameLength =
	  (db
	    ? (db.user
	      ? (db.user.name
	        ? db.user.name.length
	        : undefined)
	      : undefined)
	    : undefined);
	  
上述几种方式都既存在准确性的问题，也存在可读性以及代码量的问题，幸运的是，ES2020为我们引入了可选链(optional chaining)来解决上述问题。

### 可选链介绍(optional chaining)

