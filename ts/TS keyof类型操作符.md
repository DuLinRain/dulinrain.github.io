# TS keyof类型操作符

keyof操作符通常用于获取一个Object类型的所有key，作为union类型返回。也就是说keyof的操作对象是个类型，结果仍然是个类型。
```ts
interface Person {
  age: number;
  name: string;
}

type PersonKeys = keyof Person; // "age" | "name"
```
当然keyof并不是只能用做Object类型，它也可以作用于任何类型，对任意类型 T, keyof T 的结果是 T的所有公有属性名的union。
```ts
type Test = keyof string
// 等价于
type Test = number | typeof Symbol.iterator | "toString" | "charAt" | "charCodeAt" | "concat" | "indexOf" | "lastIndexOf" | "localeCompare" | "match" | "replace" | "search" | "slice" | ... 30 more ... | "padEnd"
```
### extends keyof是啥意思呢？
keyof看起来比较常规，但是我们通常在阅读别人的代码的时候会看到extends keyof这样的类型表述，这又是啥意思呢？
extends在常规来看是继承的意思，但是在这里它主要的作用并不是继承，而是通常用做泛型参数的类型约束。通常看起来长这样：<T, K extends keyof T>。K只能是类型T的公有属性，它与类型继承没有半毛钱关系了。它在下面这种场景下非常有帮助：
```ts
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const person: Person = {
  age: 22,
  name: "Tobias",
};

// name is a property of person
// --> no error
const name = getProperty(person, "name");

// gender is not a property of person
// --> error
const gender = getProperty(person, "gender");
```
更实际的例子可以看看Object.entries的类型声明：
```ts
interface ObjectConstructor {
  // ...  
  entries<T extends { [key: string]: any }, K extends keyof T>(
    o: T,
  ): [keyof T, T[K]][];
  // ...
  }

```
### in keyof又是啥意思呢？
除了extends keyof，我们还常常会见到in keyof，这个又是什么呢？这个其实是类型映射。通常用于把一个类型映射成另一个类型：
```ts
const person: Person = {
  age: 22,
  name: "Tobias",
};
type Optional<T> = { 
  [K in keyof T]?: T[K] 
};

const person: Optional<Person> = {
  name: "Tobias"
  // notice how I do not have to specify an age, 
  // since age's type is now mapped from 'number' to 'number?' 
  // and therefore becomes optional
};
```
类型映射的作用就不展开了，可以移除或增加原类型的readonly或optional修饰符

### 参考
- https://stackoverflow.com/questions/57337598/in-typescript-what-do-extends-keyof-and-in-keyof-mean
