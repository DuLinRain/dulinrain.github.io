# TS 公用类型
ts提供了很多公用类型用于做类型转换。
### Awaited<Type> 
Awaited<Type> 通常用在异步函数的返回值或者Promise的then中。
```ts
type A = Awaited<Promise<string>>; // 等价于 type A = string
type B = Awaited<Promise<Promise<number>>>; // 等价于 type B = number
type C = Awaited<boolean | Promise<number>>; // 等价于 type C = boolean | number
Partial<Type>
Partial<Type>用于从Type类型中构建出一个新的类型，这个新的类型会将Type的所有属性都变成带optional修饰符的。
type IUser = {
    name?: string;
    readonly age: number;
}

type PartialIUser = Partial<IUser>
// 等价于
type PartialIUser = {
    name?: string;
    readonly age?: number;
}
```
### Partial<Type>的一个常见用处是用于覆盖原对象的场景：
```ts
type IUser = {
    name?: string;
    age: number;
} 
const temp: IUser = {name: '1212', age: 10}
const partial: Partial<IUser> = {age: 12}
const C: IUser = {...temp, ...partial}
Required<Type>
Required<Type> 与Partial<Type>作用正好相反，它是将目标类型的所有属性都变成required，也就是去掉optional修饰符。
interface Props {
  a?: number;
  b?: string;
}
type RequiredProps = Required<Props>;
// 等价于
interface RequiredProps {
  a: number;
  b: string;
}

const obj: Props = { a: 5 };
 
const obj2: Required<Props> = { a: 5 }; // 报错

```
### Readonly<Type>
Readonly<Type>与Required<Type>类似，相当于将目标类型的所有属性都变成readonly，也就是加上readonly修饰符。
```ts
interface Todo {
  title: string;
}
type ReadonlyTodo = Readonly<Todo>;
// 等价于
interface Todo {
  readonly title: string;
}
 
const todo: Readonly<Todo> = {
  title: "Delete inactive users",
};
 
todo.title = "Hello"; // 报错
Object.freeze的定义就可以通过它来实现：
function freeze<T>(obj: T): Readonly<T>;
```
### Record<Keys, Type>
Record<Keys, Type>可以用于构造Object类型，其属性类型是Keys，Keys通常用union类型表示，当然也可以是原始类型。
```ts
type One = Record<string, number[]>

type IUser = {
    name?: string;
    readonly age: number;
}

type Two = Record<keyof IUser, string>
// 等同于 
type Two = {
    name: string;
    age: string;
}
// 也等同于
type Two = Record<"name" | "age", string>
```
### Pick<Type, Keys>
Pick<Type, Keys>从类型Type(通常是Object类型)中，挑选一些属性，组成新的类型。Keys通常用union类型表示。
```ts
interface Todo {
  title: string;
  description: string;
  completed: boolean;
}
 
type TodoPreview = Pick<Todo, "title" | "completed">;
// 等价于
type TodoPreview = {
    title: string;
    completed: boolean;
}

const todo: TodoPreview = {
  title: "Clean room",
  completed: false,
};
```
### Omit<Type, Keys>
Omit<Type, Keys>从类型Type(通常是Object类型)中，去除一些属性，组成新的类型。Keys通常用union类型表示。
```ts
interface Todo {
  title: string;
  description: string;
  completed: boolean;
}
 
type TodoPreview = Omit<Todo, "title" | "completed">;
// 等价于
type TodoPreview = {
    description: string;
}

const todo: TodoPreview = {
  description: "Clean room"
};
```
### Exclude<UnionType, ExcludedMembers>
Exclude<UnionType, ExcludedMembers>从UnionType类型中移除ExcludedMembers后得到的新类型。
```ts
type T0 = Exclude<"a" | "b" | "c", "a">;
// 等价于
type T0 = "b" | "c"
type T1 = Exclude<"a" | "b" | "c", "a" | "b">;
// 等价于
type T1 = "c"
type T2 = Exclude<string | number | (() => void), Function>;
// 等价于
type T2 = string | number
```
### Extract<Type, Union>
Extract<Type, Union>从Type类型中选出在Union类型中的项：
```ts
type T0 = Extract<"a" | "b" | "c", "a" | "f">;
// 等价于
type T0 = "a"
type T0 = Extract<"a" | "b" | "c", "a" | "c">;
// 等价于
type T0 = "a" | "c"
type T1 = Extract<string | number | (() => void), Function>;
// 等价于
type T1 = () => void
```
### NonNullable<Type>
NonNullable<Type>取出Type中不是undefined类型以及null类型的类型组成新类型：
```ts
type T0 = NonNullable<string | number | undefined>;
// 等价于
type T0 = string | number
type T1 = NonNullable<string[] | null | undefined>;
// 等价于
type T1 = string[]
```
### Parameters<Type>
Parameters<Type>表示函数的参数类型，Type通常是一个函数类型：
```ts
declare function f1(arg: { a: number; b: string }): void;
 
type T0 = Parameters<() => string>;
// 等价于
type T0 = []
type T1 = Parameters<(s: string) => void>;
// 等价于
type T1 = [s: string]
type T2 = Parameters<<T>(arg: T) => T>;
// 等价于
type T2 = [arg: unknown]
type T3 = Parameters<typeof f1>;
// 等价于
type T3 = [arg: {
    a: number;
    b: string;
}]
type T4 = Parameters<any>;
// 等价于
type T4 = unknown[]
```
### ConstructorParameters<Type>
ConstructorParameters<Type>返回的是构造函数的参数组成的数组类型或者元组类型：
```ts
type T0 = ConstructorParameters<ErrorConstructor>;
// 等价于
type T0 = [message?: string]
type T1 = ConstructorParameters<FunctionConstructor>;
// 等价于     
type T1 = string[]
type T2 = ConstructorParameters<RegExpConstructor>;
// 等价于
type T2 = [pattern: string | RegExp, flags?: string
type T3 = ConstructorParameters<any>;
// 等价于   
type T3 = unknown[]
```
### ReturnType<Type>
ReturnType<Type>返回函数类型Type的返回值类型：
```ts
declare function f1(): { a: number; b: string };
 
type T0 = ReturnType<() => string>;
// 等价于   
type T0 = string
type T1 = ReturnType<(s: string) => void>;
// 等价于   
type T1 = void
type T2 = ReturnType<<T>() => T>;
// 等价于   
type T2 = unknown
type T3 = ReturnType<<T extends U, U extends number[]>() => T>;
// 等价于   
type T3 = number[]
```
### InstanceType<Type>
InstanceType<Type>返回Instance类型的类型：
```ts
class C {
  x = 0;
  y = 0;
}
 
type T0 = InstanceType<typeof C>;
// 等价于
type T0 = C
type T1 = InstanceType<any>;
// 等价于
type T1 = any
type T2 = InstanceType<never>;

try {

} catch (e: InstanceType<Error>) {
    alert(e.message)
}
```
### 其它
更多公共类型可查看TS源代码中的类型定义
https://github.com/microsoft/TypeScript/blob/main/lib/lib.es5.d.ts#L1549-L1644
