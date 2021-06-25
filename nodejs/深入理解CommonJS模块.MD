# 深入理解CommonJS模块

NodeJS里是原生支持CommonJS模块的。我们在写NodeJS的时候会随心所欲地在文件中直接用`module.exports`，`exports`, `require`等，就好像它们都是全局存在一样。实际上并不是这样的。NodeJS将每个文件都视为一个独立的模块，我们在文件中使用的`module`，`exports`, `require`实际上都只是在当前文件中存在的局部变量。除了前面提到的几个变量，还存在`__filename`, `__dirname` 这2个看着像是全局存在的变量。实际上，NodeJS在执行每个文件之前都会给它在外面包裹这么一层代码：

```javascript

(function(exports, require, module, __filename, __dirname) {
  // 模块代码在这里
});

```

看到上面的代码你就明白了，NodeJS这么做带来了几个好处：
- 我们在模块中定义的`var`, `const`, `let`等变量都被限定在当前模块范围内，而不是全局范围
- 提供了几个看起来像全局但实际是局部范围的变量，比如
  - 模块实现者可以通过`module`, `exports`对象将模块内的东西提供给模块外使用
  - `__filename`, `__dirname`提供模块的全局文件名路径和目录路径。


### module 和 exports和 moudle.exports

前面说了，`module` 和 `exports`都是对象，那他们是什么关系呢？我们在前面我们说CommomJS提供了`module.exports`，`exports`, `require`，`__filename`, `__dirname`这几个变量，但你可以认为实际上只提供了`moudle`，`require`，`__filename`, `__dirname`这几个。而这其中，`module`则是实际存在的，并没有什么`exports`。实际上，`module`是个对象，`exports`只是`module`对象上的一个非常重要的属性。即`module`的类型可以表示成如下：

```javascript

interface IModule {
    exports: {},
    [x:string]?: any
}

```

我们在CommonJS导出模块时经常可以用`module.exports`和`exports`2种方式，比如：

```javascript

function foo(){}
function bar(){}
module.exports = {
    foo,
    bar
}

// 或者
exports.foo = foo;
exports.bar = bar;

```

实际上，`exports`变量是只在模块范围内的变量，并且在模块执行之前被赋给`module.exports`。

怎么理解呢？实际上，`exports` 只是 `module.exports`的一个捷径，你可以认为他们是这样的关系：

```javascript
var exports = module.exports;
```


所以，你在`exports`变量上的做的操作（增加的导出属性）等效于在`module.exports`上做的操作，如：

```javascript
var exports = module.exports;
exports.foo = foo;
exports.bar = bar;

//等同于
module.exports.foo = foo;
module.exports.bar = bar;

```

但是，如果你在其中将别的东西赋给了`exports`，之后不论你在`exports`上增加什么操作，都和`moudle.exports`没有关系了。比如：

```javascript

var exports = module.exports;
exports = {}
exports.foo = foo;
exports.bar = bar;

//不等同于，因为exports已经不指向module.exports了
module.exports.foo = foo;
module.exports.bar = bar;

```

所以，真正起作用的实际上是`module`，或者说是`module`上的`exports`属性，即`module.exports`。

为了更好的理解这一点，你可以想象`require`的如下实现：

```javascript
function require(/* ... */) {
  const module = { exports: {} };
  ((module, exports) => {
    // Module code here. In this example, define a function.
    function someFunc() {}
    exports = someFunc;
    // At this point, exports is no longer a shortcut to module.exports, and
    // this module will still export an empty default object.
    module.exports = someFunc;
    // At this point, the module will now export someFunc, instead of the
    // default object.
  })(module, module.exports);
  return module.exports;
}

```

所以回过头来看看前面NodeJS在执行模块时给每个模块增加的一个包裹函数：

```javascript

(function(exports, require, module, __filename, __dirname) {
// 模块代码在这里
});

```

是不是就相当于：


```javascript

// var exports = module.exports
(function(exports, require, module, __filename, __dirname) {
// 模块代码在这里
});
// 第一个参数和第三个参数是啥关系是不是清楚多了

```

所以，实际上CommomJS给我们提供的实际上只有4个东西（`module`，`require`，`__filename`, `__dirname`）。


### module对象的其它属性
实际上，`module`对象并不仅仅有`exports`属性，他还有很多其他的属性，了解这些属性对于我们理解CommomJS以及实际开发有很大帮助。

#### module.id
模块标识符`id`是`module`对象上一个很重要的属性，用来标识每个模块，通常是模块文件的绝对路径。这对于我们将多个有依赖关系的模块最终打包到一起非常有帮助。
#### module.filename
`filename`属性表示的是模块的绝对路径，即`__filename`。
#### module.path
表示模块的绝对路径，即`__dirname`。

### require方法
前面讲完了CommomJS模块的基本概念以及模块的导出，CommomJS加载模则是使用的`require`方法。`require`方法的语法就是`require(id)`。这里`id`就是模块的标识符或者模块名，返回结果则是模块的导出内容。

`require`方法本身也是有自己的属性的，下面是几个常用的属性：

#### require.cache
当模块被首次加载时会缓存在`require.cache`这个对象上，这意味着多次调用同一个`require`，比如`require('foo')`会拿到相同的结果，并且不会重新执行一遍`require`的模块。

这虽然会带来一些收益，但是也是有一定弊端的。比如：

- 由于模块是依据它的绝对路径作为`key`缓存的，这意味着在不同的地方调用模块有可能会解析到不同的绝对路径，所以会存在多次加载。
- 在目录/文件大小写不敏感的系统里，仅大小写不同的文件可能解析到相同的目录，但是他们模块缓存时的`key`是不一样的，这样也会导致相同他们也会被认为是2个不同的模块。

通过删除`require.cache`上的某个`key`可以使得再次`require`对应的模块的时候该模块被重新加载。这对于NodeJS的HMR非常有帮助，因为当我们改变文件内容后想让某个文件自动重新加载的话只需要删除对应的缓存即可。

> 注意：通过删除key来让模块重新加载并不适用于native addons，因为这些模块重新加载会导致错误。

#### require.main
指向整个模块加载的最开始的那个模块。当一个模块直接通过NodeJS运行时，`require.main`就指向这个入口模块。比如，对于`foo.js`，如果通过`node foo.js`直接运行的话，`require.main`就指向`foo.js`这个模块，所以代码中`require.main === module`会成立。但是如果不是直接node执行，而是被其它模块`require`的话，比如：

```javascript

// bar.js

var foo = require('./foo')
foo()

// node bar.js

```

那么在`foo.js`内，`require.main === module`则不成立，因为`require.main`总是指向的入口模块。因为`module`提供了`filename`属性用来表示模块的路径，所以可以通过`require.main.filename`表示整个应用的入口。

> 小知识：也可以知道，可以通过require.main === module来判断当前模块是不是直接通过node xxx.js方式直接执行的。


### 参考

- https://nodejs.org/dist/latest-v16.x/docs/api/modules.html