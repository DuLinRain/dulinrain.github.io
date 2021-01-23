# NodeJS 事件循环(Event Loop) Part5——最佳实践

欢迎回到事件循环系列。到目前为止，在事件循环这一系列中，我们讨论了事件循环和它的不同节拍，`setImmediates`, `nextTicks`, `timers`, I/O。我相信你现在对事件循环有了更深入的理解。因此，让我们讨论一下最佳实践，讨论在开发NodeJS应用程序时候该做什么和不该做什么从而达到最好的性能和结果。

### 一、避免在循环中使用同步I/O
一定要避免在重复调用的代码块(如循环或者经常调用的函数)中使用同步I/O函数。这是因为，如果你这么做(在循环或经常调用的函数中使用同步I/O)的话，每次同步I/O执行的时候都会阻塞事件循环。这些同步函数最安全的用例之一是在应用程序启动期间读取配置文件。

### 二、函数应当要么是完全异步或完全同步的
你的应用程序包含一些小的函数调用。在NodeJS中，可以将函数分为同步和异步2种：

1. 同步函数 —— 同步函数通常通过return关键字返回结果(如`Math`函数，`fs.readFileSync`等)或者使用Continuation-Passing模式返回结果/执行某种操作(如`Array.prototype`上的`map`, `filter`, `reduce`等方法)
2. 异步函数 —— 返回通过callback或promise延迟的结果(如`fs.readFile`, `dns.resolve`等)

一个经验法则是，你写的函数应当：

- 完全同步 —— 对所有输入/条件都保持同步
- 完全异步 —— 对所有输入/条件都保持异步

如果你的函数是以上2种的混合体，它将导致你的应用程序出现不可预期的结果。让我们看一个例子：


	const cache = {};
	
	function readFile(fileName, callback) {
	    if (cache[filename]) {
	        return callback(null, cache[filename])
	    }
	
	    fs.readFile(fileName, (err, fileContent) => {
	        if (err) return callback(err);
	        
	        cache[fileName] = fileContent;
	        callback(null, fileContent);
	    });
	}

现在让我们写一个简单的应用，使用上述函数。为了便于阅读，我省略了错误处理。

	function letsRead(){
	  readFile('myfile.txt', (err, result) => {
	    // error handler redacted
	    console.log('file read complete');
	  });
	
	  console.log('file read initiated')
	}

现在如果你连续运行letsRead2次，你将会看到如下输出结果：

	file read initiated
	file read complete
	file read complete
	file read initiated 

发生了啥？

如果你第一次运行`letsRead`函数，缓存中并没有`myfile.txt`。因此，会执行异步函数`fs.readFile`来访问文件系统。在这种情况下，`letsRead`函数行为是异步的。

当letsRead第二次执行的时候，缓存中并有`myfile.txt`。因此，没有必要再访问文件系统，回调函数被立即同步执行。这种情况下，`letsRead`函数表现为同步。

当我们的应用变得复杂后，这种同步/异步混合的函数很容易导致一些问题，而且不容易调试和定位。因此，强烈建议你遵从上述规则。

所以，我们该怎样修复上述函数呢？我们有2个办法：

- **方法一** 改用`fs.readFileSync`函数使得`readFile`函数永远保持同步
- **方法二** 通过异步调用callback使得`readFile`函数永远保持异步

正如我们在前面所说，将一个会多次调用的函数保持为异步函数比较好。因此我们不使用方法一，因为它会造成极大的性能损失。那么我们该如何按方法二实现呢？很简单，我们使可以用`process.nextTick`。

	const cache = {};
	
	function readFile(fileName, callback) {
	    if (cache[filename]) {
	        return process.nextTick(() => callback(null, cache[filename]));
	    }
	
	    fs.readFile(fileName, (err, fileContent) => {
	        if (err) return callback(err);
	        
	        cache[fileName] = fileContent;
	        callback(null, fileContent);
	    });
	}

`process.nextTick`将会把callback的执行时间推迟一个事件循环节拍。现在如果你连续执行2次`letsRead`函数，你会得到一致的输出结果。

	file read initiated
	file read complete
	file read initiated
	file read complete

你也可以使用`setImmediate`来实现，但是我推荐使用`process.nextTick`，因为`process.nextTick`队列会在`setImmediate`之前执行。

### 二、过多的nextTicks
尽管`process.nextTick`在很多场景很有用，持续的使用`process.nextTick`会导致I/O饥饿。这将迫使NodeJS持续地执行nextTick回调，从而不会进入事件循环I/O节拍。

### 三、dns.lookup vs dns.resolve*()
如果你阅读过NodeJS dns模块文档，你会发现有2种方法使用dns模块解析域名到ip地址。即`dns.lookup` 和 `dns.resolve4/dns.resolve6`。虽然这两个方法看起来一样，但是他们的内部实现却有很显著的区别。

`dns.lookup`函数表现和命令行的`ping`类似。它调用的是操作系统网络API函数`getaddrinfo`。不幸的是，这个调用不是异步的。因此，为了模仿异步行为，这个调用运行在libuv的线程池，执行的实际上是`uv_getaddrinfo`函数。这回增加线程池上其它任务之间的线程争抢概率，进而可能对应用程序的性能产生负面影响。

同样需要注意的是libuv的线程池默认只包含4个线程。因此，四个并行的`dns.lookup`调用可以完全占用线程池，从而导致没法对其它任务做处理(如果文件I/O，特定的加密函数，以及更多的`dns.lookup`).

相反，`dns.resolve()`和其它`dns.resolve*()`以完全不同的方式工作。下面是官方文档对`dns.resolve*`的描述：

>这些函数与`dns.lookup()`的实现完全不同。它们使用的不是`getaddrinfo(3)`，而是始终通过网络请求进行DNS查询。网络请求始终是异步的，并且不占用libuv线程池。
>

NodeJS通过流行的**c-ares**模块提供DNS解析的能力。该模块木依赖于libuv的线程池，并且完全基于网络工作。

因为`dns.resolve`不会增加线程池的负荷。所以如果没有强制要求使用`/etc/nsswitch.conf`, `/etc/hosts`等配置文件(`getaddrinfo`使用)，建议使用`dns.resolve`。

但是仍然有一个大问题！

假设你使用NodeJS发起一个到`www.example.com`的HTTP请求。首先他会解析`www.example.com`到IP地址，然后使用解析的IP地址发起异步TCP连接。所以发送一个HTTP请求是需要2个步骤的过程。

现在，Node的`http`和`https`模块内部使用的都是`dns.lookup`来解析IP。如果DNS服务商出问题或者遇到较高的网络/DNS延迟，多个http请求很容易会导致线程池爆满，从而无法继续处理其它请求。这已经引起了一些关于http和https的关切，但是到目前为止，为了和操作系统行为保持一致，这一点还是没有解决。

如果你在应用程序中发现文件I/O，加密或者其它依赖线程池的任务的性能极大的降低，有一些办法可以提升性能：

- 你可以通过环境变量`UV_THREADPOOL_SIZE`将线程池的大小设置为最大128. 
- 使用`dns.resolve*`函数解析IP地址，或者直接使用IP地址。下面是使用request模块的一个例子。

##

	const dns = require('dns');
	const http = require('http');
	const https = require('https');
	const tls = require('tls');
	const net = require('net');
	const request = require('request');
	const httpAgent = new http.Agent();
	const httpsAgent = new https.Agent();
	const createConnection = ({ isHttps = false } = {}) => {
	    const connect = isHttps ? tls.connect : net.connect;
	    return function(args, cb) {
	        return connect({
	            port : args.port,
	            host : args.host,
	            lookup : function(hostname, args, cb) {
	                dns.resolve(hostname, function(err, ips) {
	                    if (err) { return cb(err); }
	
	                    return cb(null, ips[0], 4);
	                });
	            }
	        }, cb);
	    }
	};
	
	httpAgent.createConnection = createConnection();
	httpsAgent.createConnection = createConnection({isHttps: true});
	
	function getRequest(reqUrl) {
	    request({
	        method: 'get',
	        url: reqUrl,
	        agent: httpsAgent
	    }, (err, res) => {
	        if (err) throw err;
	        console.log(res.body);
	    })
	}
	
	getRequest('https://example.com');



	

>注意：下面的代码是未优化的，仅供参考。


### 三、关于线程池的担忧
正如我们在该系列文章中一直提及的，线程池用来处理除文件I/O之外的很多事情并且可能成为应用程序的一个瓶颈。如果你在应用程序中发现文件I/O，加密或者其它依赖线程池的任务的性能极大的降低，可以考虑通过环境变量`UV_THREADPOOL_SIZE`将线程池的大小设置为最大128. 

### 四、线程池监控
对事件循环的延迟进行监控对避免程序崩掉至关重要。这也可以用于生成警报，执行强制重启和扩容服务。

最简单的判断事件循环延迟的方式是检查定时器回调的执行时间超过指定时间多少。简单说，如果我们设置了一个500ms超时的定时器，实际上等到550ms后才执行定时器回调。那么这50ms可以认为是在执行事件循环的其它节拍的耗时，你没有必要亲子写这部分代码，你可以使用**loopbench**包来完成同样的事情。让我们看看你可以怎么做。

安装完后，你可以仅用几行代码实现要的效果：

一个有趣的用法是，你可以将监控结果上报给某个分析终端从而可实现一个告警和监控工具。

上报的格式可以是类似这样的：

	{
	  "message": "application is running",
	  "data": {
	    "loop_delay": "1.2913 ms",
	    "loop_delay_limit": "42 ms",
	    "is_loop_overloaded": false
	  }
	}

有了监控实现，你可以在检测到事件循环负荷过重的时候返回503。这也有助于负载均衡处理器将请求转发到别的实例上去。

### 总结
在这篇文章中，我总结了整个NodeJS事件循环系列。我相信你可能通过这一系列的文章学习到了不少关于NodeJS的概念。