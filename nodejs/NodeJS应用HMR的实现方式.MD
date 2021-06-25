# NodeJS应用HMR的实现方式

前端项目的HMR我们都比较熟悉，NodeJS的项目HMR是怎么实现的呢？实际上本质上是一样的———**监听文件变化并重新加载**。但是与前端所谓的HMR不完全一样，NodeJS里的HMR可以认为只是HR（Hot Reload）。因为我们常见的模式都是监听到文件变动之后直接重启NodeJS应用。

下面我们看看这其中涉及的工作。
### 监听文件变化
要实现HR首先就需要具备监听文件变化的能力，实际上我们首先想到的就是NodeJS内置文件模块的 `fs.watch` 和 `fs.watchFile`。

> NodeJS里`fs.watch` 比 `fs.watchFile` 效率更高。

但我们常见的NodeJS HR方案，比如`nodemon`里，使用的都是`chokidar`这个包来实现文件监听功能的。它和直接用`fs.watch`有啥差异呢？

#### fs.watch & fs.watchFile 存在的问题
NodeJS内置的`fs.watch` & `fs.watchFile`也能实现文件监听，但是各自存在一些问题。


##### fs.watch 

- 在MacOS上不会报告文件名
- 当在MacOS上使用Sublime这样的编辑器时也不会上报事件
- 经常同一事件上报2次
- 把大多数事件上报成`rename`
- 递归监听文件树变化不是很方便
- 在Linux上不支持递归监听

##### fs.watchFile 
- 除了`fs.watch`的问题，它还占用更多的CPU

#### chokidar 是怎么解决的？
实际上，`chokidar` 也是基于NodeJS的`fs.watch`/`fs.watchFile`来实现的。但是在他们的基础上做了很多改进。

- 事件归一化。`chokidar`在使用`fs.watch`/`fs.watchFile`时会将收到的事件归一化处理。通常会用文件或目录的实际状态做进一步核对。
- 更方便的递归监听。在MacOS上，`chokidar`默认使用系统原生的FSEvents API扩展，这提供了更加方便的递归监听方式。

### 监听到变化后自动重启
在监听到文件变化后接下来要做的就是重启应用，这里通常会基于`chokidar`再做一层封装，我们常用的 [nodemon](https://github.com/remy/nodemon/blob/master/lib/monitor/watch.js) 就是这么做的。

`nodemon`的使用也非常简单，不需要额外的操作，直接像使用`node`启动一样：

    nodemon ./youAppEntry.js


### 可不可以不重启
可以看出，NodeJS的HR和前端的HMR还是差异较大的，前端HMR的并不会重启整个应用，只是部分模块的热替换。NodeJS里要做到这样可以利用删除CommomJS的 `require.cache` 来实现，因为删除对应的cache后再次require的时候回重新加载对应的模块，但是这个方式也有很多弊端，解决不了所有问题。


### 参考

- https://www.npmjs.com/package/chokidar
- https://www.npmjs.com/package/nodemon