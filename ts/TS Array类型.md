# TS Array类型

`Array`类型的标准定义方式是`Array<T>`，是使用泛型的方式去定义的。我们平时使用的`T[]`只不过是前者的**简洁写法**，二者没啥区别。

`Array`类型本身也是按照泛型的方式定义的：

```ts

interface Array<Type> {
  /**
   * Gets or sets the length of the array.
   */
  length: number;
 
  /**
   * Removes the last element from an array and returns it.
   */
  pop(): Type | undefined;
 
  /**
   * Appends new elements to an array, and returns the new length of the array.
   */
  push(...items: Type[]): number;
 
  // ...
}

```


除了普通的`Array`类型外，还有`ReadonlyArray`类型，顾名思意，我们只能读取它，不能修改它的元素。`ReadonlyArray`类型也有简便写法，即`readonly Type[]`。普通的`Array`类型是可以赋值给`ReadonlyArray`类型的。但是与`Object`类型的 `readonly`修饰符不同的是，`Array`类型和`ReadonlyArray`类型不能双向赋值。即只能将普通的`Array`类型赋值给`ReadonlyArray`类型。

`ReadonlyArray`类型比较常见的用法是：

- 作为函数的参数告诉我们函数内部不会对参数进行修改。
- 作为函数的返回值，表明它不能被修改。