# TS Object类型

### 定义Object类型的三种方式
TS中定义Object类型有三种方式：匿名方式、interface方式、type方式。

```ts
// 匿名方式（通常用在参数位置）
function test(a: {name: string; age: number}){}
// 接口方式
interface IUser {
    name: string;
    age: number;
}
// type方式
type IUser = {
    name: string;
    age: number;
}
```

Object类型有2种属性修饰符：optional修饰符和readonly修饰符。顾明思意，optional就是可有可无，readonly则是只读，不可重新赋值。

```ts
type IUser = {
    name?: string;
    readonly age: number;
}

var obj: IUser = {
    name: 'hehe',
    age: 10
}
obj.age = 12 // 报错
obj.age++  // 报错
```

属性相同但修饰符不同的对象类型是兼容的吗？
那么，如果2个Object类型的字段一模一样，只是属性修饰符不一样，那么他们是同一个类型吗？严格说它们不是同一个类型，但是他们是兼容的，即可以互相赋值。

```ts
interface Person {
  name: string;
  age: number;
}
 
interface ReadonlyPerson {
  readonly name: string;
  readonly age: number;
}
 
let writablePerson: Person = {
  name: "Person McPersonface",
  age: 42,
};
 
// works
let readonlyPerson: ReadonlyPerson = writablePerson; // 不会报错
let writablePersonTest: Person = readonlyPerson; // 也不会报错
```

### 绕过readonly属性的2种方式
#### 使用兼容性特性绕过
基于上面「属性相同但修饰符不同的对象类型是兼容的」这样的事实，其实我们就有办法绕过readonly属性「不能重新赋值」的问题了，方法就是定义一个与包含readonly属性一样的Object类型的对象，然后吧它赋值给包含readonly属性的Object类型的变量：

```ts
interface Person {
  name: string;
  age: number;
}
 
interface ReadonlyPerson {
  readonly name: string;
  readonly age: number;
}
 
let writablePerson: Person = {
  name: "Person McPersonface",
  age: 42,
};
 
// works
let readonlyPerson: ReadonlyPerson = writablePerson;
 

console.log(readonlyPerson.age); // prints '42'
readonlyPerson.age++; // 报错
writablePerson.age++;
console.log(readonlyPerson.age); // prints '43' 绕过了readonly属性
```
虽然看起来没什么用，但是实际上证明是可以通过这种方式绕过readonly属性的特性的。
当然绕过readonly属性最常用的方式是使用mapping修饰符移除readonly修饰符。
#### 使用mapping映射类型移除readonly
> 顾明思意，mapping映射类型就是把一个类型映射成另一个
我们可以在使用mapping映射的时候移除掉原类型的readonly属性：

```ts
type MAPPERSON = {
    -readonly [Property in keyof ReadonlyPerson]: ReadonlyPerson[Property]
}

// 等价于
type MAPPERSON = {
  name: string;
  age: number;
}
```
### 扩展Object类型
对象类型扩展有点继承的意思，就是在原有的类型上增加新的属性，继承可以是一个或者多个：
```ts
interface Colorful {
  color: string;
}
 
interface Circle {
  radius: number;
}
 
interface ColorfulCircle extends Colorful, Circle {}
 
const cc: ColorfulCircle = {
  color: "red",
  radius: 42,
};
```
### Object类型交集
> https://jaked.org/blog/2021-10-28-Reconstructing-TypeScript-part-5
```ts
interface Colorful {
  color: string;
}
interface Circle {
  radius: number;
}
 
type ColorfulCircle = Colorful & Circle;
```
> 交集和我们常规数学上理解的并不一样，这个交是都包含的意思。交集比这里提到的会复杂很多，后面会专门讲讲。
