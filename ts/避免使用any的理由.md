# 避免使用any的理由

`any`并不一定是坏事，但是通常情况下`unknown`可能是比`any`更好的一个替代项。

### any缺少类型检查
对于同样一个变量，如果是`any`类型，你可以对他做任何操作。比如`.length`，但是如果是`unknown`，则需要做类型守护后才可以操作，这样会更加安全。

```ts
  var a: any = "haha";
  var b: unkown = "haha"
  a.length; // 不报错，类型检查会关闭
  b.length; // 报错， b is unknown

  我们需要进行类型守护后才可以操作
  if (typeof b === "string") {
      b.length
  }

```

但是上面是比较简单的情况，有些时候，当我们确实不知道目标是啥类型的时候，`any`经常非常有用。比如接收到的请求，又比如`JSON.parse`后的内容，这时候同样我们适合用`Record<string, unknown>`代替`any`。


```ts
const foo: any = { a: 1, b: 2 };
const bar: Record<string, number> = { a: 1, b: 2};
foo.a; // Anything
bar.a; // Number
const obj = JSON.parse(response) as Record<string, unknown>[];
obj[0].id; // unknown but we can at least access it correctly


```