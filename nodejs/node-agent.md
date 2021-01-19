# taf的node-agent详解
在taf上部署node服务，实际上是通过node-agent进行管理的。node-agent作为主进程，fork出子进程，启动我们的服务。 那么，到这里脑海里就会自然而然的浮现出下面这些问题：

1. node-agent是如何启动我们的应用的？
2. 到底会fork出多少个子进程呢？
3. ecu和真实的cpu的关系是怎样的？
4. node-agent是如何管理子进程的？子进程挂掉后，新fork的进程ID是否会变化呢？ 
5. 进程消息处理？
6. 如何在TAF下跑定时任务呢？

本文将尝试解答这些问题。

### 一、node-agent是如何启动我们的应用的？
很多人咋一看不太知道`node-agent`启动的入口点在哪里，实际上，正如文档所述`node-agent` 启动时传入的第二个参数用来指定服务脚本执行的入口点文件，其中：

 * 可以直接传入脚本文件用于执行，如 `./app.js` 

 * 也可以传入脚本文件所在的目录，如 `./`

当传入的为目录时，入口点根据如下顺序进行确认：

1. 目录中存在 `package.json` 文件，则：
	1. 查找 `nodeAgent.main`
	2. 查找 `scripts.start`（此配置节需要以 `node` 打头才可识别）
	3. 查找 `main` 
2. 查找目录中是否存在： `server.js`、`app.js`、`start.js`、`index.js`

只要其中的一项匹配则作为入口点文件来执行，并不再往下匹配。下面是代码中这段逻辑的实现：

	// 参见./bin/node-agent
	// 目录，目录下是否有package.json文件
	if (existsSync(path.resolve(commander.args[0], 'package.json'))) {
		try {
			scriptPkg = require(path.resolve(commander.args[0], 'package.json'));
		} catch(e) {}
		//package.json里配置了nodeAgent.main
		if (scriptPkg && scriptPkg.nodeAgent && scriptPkg.nodeAgent.main) {
			entrypoint = path.resolve(commander.args[0], scriptPkg.nodeAgent.main);
			// 否则，看scripts里是否配置了start: 'node xxxx'
		} else if (scriptPkg && scriptPkg.scripts && scriptPkg.scripts.start && scriptPkg.scripts.start.indexOf('node ') === 0) {
			entrypoint = path.resolve(commander.args[0], scriptPkg.scripts.start.slice(5));
			// package.json里是否配置main
		} else if (scriptPkg && scriptPkg.main) {
			entrypoint = path.resolve(commander.args[0], scriptPkg.main);
		}
	}
	// 如果以上都没有， 则看是否有'server.js', 'app.js', 'start.js', 'index.js'这几个文件
	if (!entrypoint) {
		constants.ENTRY_POINT_NAME.some(function(name) {
			if (existsSync(path.resolve(commander.args[0], name))) {
				entrypoint = path.resolve(commander.args[0], name);
				return true;
			} else {
				return false;
			}
		});
	}

拿koa的helloword举例，我们建一个文件夹，里面放一个package.json，一个index.js如下：

	// index.js
	const Koa = require('koa');
	const app = new Koa();
	
	app.use(async ctx => {
	  ctx.body = 'Hello World';
	  console.log('helloword')
	});
	console.log('=============hehheheheh')
	app.listen(process.env.PORT, process.env.IP);
	
这样直接部署， 就启动了一个taf-node应用。

### 二、 到底会fork出多少个子进程呢？
`node-agent`作为master进程，fork出子进程，我们的应用就是作为子进程被master进程管理。`node-agent` 采用的是 Node.js 原生的 [Cluster](http://www.nodejs.org/api/cluster.html "Cluster") 模块来实现负载均衡的。按照我们通常所接受的知识，子进程的个数最好和cpu的核心数一致，这样能充分利用多核cpu的作用。

那`node-agent`在启动我们的应用的时候会fork多少个子进程呢？它是按照这个来的吗？

实际上`node-agent`以命令行形式启动时，可通过-i, --instances配置 `node-agent` 启动的子进程（业务进程）数量：

* 未配置（或配置为 `auto`、`0`），启动的子进程数量等于 `CPU 物理核心` 个数。

* 配置为 `max`，启动的子进程数量等于 CPU 个数（所有核心数）。

如果 `node-agent` 是由 `tafnode` 启动的，会自动读取TAF配置文件中的 `taf.application.client.asyncthread` 配置节。

也可通过 `TAF平台 -> 编辑服务 -> 异步线程数` 进行调整。

下面是这个策略的实现代码：

	// 实现参照 ./lib/CLI.js
	// 启动进程的个数
	var startWorker = function(opts) {
		var instances;

		if (!isNaN(opts.instances) && opts.instances > 0) {
			instances = opts.instances;
		} else {
			if (opts.instances === -1) { // instances = max
				instances = cpu.totalCores;
			} else { // instances = auto
				if (cpu.physicalCores > 0 && cpu.totalCores > cpu.physicalCores) { //physicalCores correct
					instances = cpu.physicalCores;
				} else {
					instances = cpu.totalCores;
				}
			}
		}

		instances = instances || 1;

		console.info('forking %s workers ...', instances);

		God.startWorker(instances);
	};

### 三、ecu和真实的cpu的关系是怎样的？

`node-agent`封装了win32 和 linux架构差异，采用不同的方式得到totalCores 和 physicalCores，实在拿不到则使用os.cpus().length，其具体的示例如下：

	//测试代码
	var os = require('os')
	const numCPUs = require('os').cpus().length;

	console.log(`是否是主进程？${cluster.isMaster}, cup个数：${numCPUs}`)
	cpu.init(function(err) {
	  if (err) {
	    console.warn('%s, fallback to use os.cpus()', err);
	  }
	  console.log('device:', os.arch(), cpu.totalCores, cpu.physicalCores, os.platform(), os.hostname())
	});

	// 结果
	2019-07-02 20:58:40|137630|DEBUG|app.js:18|是否是主进程？false, cup个数：48
	2019-07-02 20:58:40|137630|DEBUG|app.js:33|device: x64 48 24 linux 10-59-20-93
	
从上面的例子可以看出，通过os拿到的cpu个数是48，通过`node-agent`封装的代码拿到的totalCores是48，physicalCores是24。而我申请的容器的ecu是2。 根据taf的文档表述，10ecu相当于1cpu。所以这里的「totalCores是48，physicalCores是24」估计是宿主机的信息。
	

### 四、 node-agent是如何管理子进程的？

#### 4.1 进程启动与进程ID
`node-agent` 会根据前面第二小节所述的结果fork对应个数的子进程。而进程的id号就是启动的序号。`node-agent`会以一个数组workers_seq来存放进程的id。假设启动3个子进程，则启动完后，进程id分别为：

	workers_seq = [0, 1, 2]
	
下面是具体的实现：

	startWorker(opts)
		let workers_seq = []
		var startWorker = function(num) {
			var i = 0, seq = 0;
			console.log('====num', num)
			num = num || 1;//至少一个
		
			for (; i < num; i += 1) {
				//workers_seq队列
				seq = workers_seq.indexOf(false);
				if (seq === -1) {
					seq = workers_seq.length;
					workers_seq.push(true);//取长度，加入去
				} else {
					workers_seq[seq] = true;//复用
				}
		
				env['WORKER_ID'] = seq;
		
				(function(worker) {
					worker._status = constants.WORKER_STATUS.LAUNCHING;//启动中
					worker._heartbeat = process.uptime();
					worker._seq = seq;//workerid
					worker.once('error', function() {
						worker._status = constants.WORKER_STATUS.ERRORED;//启动失败
					}).on('message', function(mesg) {
						cluster.emit('worker_message', worker, mesg);
					});
				}(cluster.fork(env)));
		
				delete env['WORKER_ID'];
			}
		};
		
而当某个进程退出后，其对应位置会被置为false. 假设第二个进程退出，则workers_seq将会是下面这个样子：

	workers_seq = [0, false, 2]	
	
而当新fork一个子进程的时候，他会复用第二个进程的id，workers_seq将会是下面这个样子：

	workers_seq = [0, 1, 2]	
	
具体的实现可以参考：

	on('exit', function(worker) {
		var exitedAfterDisconnect = typeof worker.exitedAfterDisconnect === 'boolean' ? worker.exitedAfterDisconnect : worker.suicide;
	
		workers_seq[worker._seq] = false;
	
		worker._status = constants.WORKER_STATUS.STOPPED;
	
		if (worker._timerId) {
			clearTimeout(worker._timerId);
			delete worker._timerId;
		}
	
		if (!exitedAfterDisconnect || worker._hasError) {
			switch(canStartWorker()) {
				case constants.CAN_START_WORKER.OK : {
					startWorker();
					break;
				}
				case constants.CAN_START_WORKER.NEED_TO_KILLALL : {
					killAll();
					break;
				}
			}
		}
	
		if (workers_seq.every(function (exists) {
			return exists !== true;
		})) {
			destroy();
		}
	})

具体的例子如下：

	2019-07-02 20:58:40|137630|DEBUG|app.js:18|是否是主进程？false, cup个数：48
	2019-07-02 20:58:40|137630|DEBUG|app.js:19|是否是子进程？true, 当前workerid：2
	2019-07-02 20:58:40|137630|DEBUG|app.js:33|device: x64 48 24 linux 10-59-20-93
	2019-07-02 20:58:40|137624|DEBUG|app.js:18|是否是主进程？false, cup个数：48
	2019-07-02 20:58:40|137624|DEBUG|app.js:19|是否是子进程？true, 当前workerid：1
	2019-07-02 20:58:40|137631|DEBUG|app.js:18|是否是主进程？false, cup个数：48
	2019-07-02 20:58:40|137631|DEBUG|app.js:19|是否是子进程？true, 当前workerid：3
	2019-07-02 20:58:40|137631|DEBUG|app.js:33|device: x64 48 24 linux 10-59-20-93
	2019-07-02 20:58:40|137624|DEBUG|app.js:33|device: x64 48 24 linux 10-59-20-93
	
子进程id保持一致的好处是，在多进程场景下，在子进程实现定时任务的时候，可以利用子进程id不变这一特点，确保只会有一个进程在执行定时任务。

#### 4.2 进程优雅退出
正常情况下，`node-agent` 在停止服务（进程）时会通过 `worker.disconnect()` 通知服务，让服务释放资源并退出。

可以设置超时时间，如果服务（进程）在给定的时间后仍然没有退出，`node-agent` 则会强制 `kill` 掉进程。

超时时间默认为 8 秒

如果 `node-agent` 是由 `tafnode` 启动的，会自动读取TAF配置文件中的 `taf.application.server.deactivating-timeout` 配置节。具体实现可参考：

	//实现参考./lib/CLI.js
	case constants.GOD_MESSAGE.FORCE_KILL_WORKER : {
		console.error('exceeded the graceful timeout, force kill worker(%s) ...', worker.process.pid);
		tafNotify.report.error('exceeded the graceful timeout, force kill worker', worker.process.pid);
		break;
	}
	
#### 4.3 进程异常退出

如果（服务）子进程出现异常退出，并在一段时间内 _（--exception-time, 默认10s）_ 异常退出的次数没有超过最大值 _（--exception-max, 默认2次）_ 。`node-agent` 将会自动拉起新的（服务）子进程，否则 `node-agent` 与服务也将异常退出。其实现可参考：

	// 实现./lib/CLI.js
	God.events.on('message', function(code, worker, args) {
		switch(code) {
			//子进程在10s内异常2次
			case constants.GOD_MESSAGE.EXCEPTION_REACHED_COND : {
				console.error('exception occurred more than %s times within %s seconds, exiting ...', constants.EXCEPTION_TOTAL, constants.EXCEPTION_TIME / 1000);
				tafNotify.report.error(util.format('exiting,exception occurred more than %s times within %s seconds', constants.EXCEPTION_TOTAL, constants.EXCEPTION_TIME / 1000), '');
				exception = true;
				break;
			}
			...
			
#### 4.4 僵尸进程处理

如果 `node-agent` 在一段时间（--keepalive-time，其默认值为 5m）内未收到（服务）子进程发送的心跳，则判定此（服务）子进程为僵尸进程（zombie process），将会直接杀死 `kill`，并作为异常进行处理。其实现可参照：

	// 在God.js中有
	var setMonitor = function() {// 心跳定时器
		heartbeat_timer = setInterval(function() {
			var uptime = process.uptime();
			allWorkers().forEach(function(worker) {
				if (worker._status === constants.WORKER_STATUS.ONLINE && uptime - worker._heartbeat > constants.WORKER_DETECT_INTERVAL && os.freemem() > minFreebytes * 2) {
					events.emit('message', constants.GOD_MESSAGE.STOP_ZOMBIE_WORKER, worker);//僵尸进程
					stopWorker(worker, true);//杀死僵尸进程
				}
			});
		}, constants.WORKER_DETECT_INTERVAL * 1000);
	};

### 五、TAF进程消息处理
`node-agent` 在fork我们的应用的时候实际上会用一个`ProcessContainer.js`包裹我们的应用，这里面会处理一些常见的消息/事件，其中比较重要的有`disconnect` 和 `uncaughtException`。默认情况下 `node-agent` 会对事件进行处理，但如果用户代码监听（处理）了该事件则 `node-agent` 将不再进行处理。

#### 5.1 disconnect事件

	// 其实现参见./ProcessContainer.js
	// if script not listen on disconnect event, program will be exit
	process.on('disconnect', function disconnect() {
		if (constants.TAF_MONITOR) {
			httpStat.unbind();
			usageStat.stop();
		}
	
		if (longstack !== null) {
			longstack.disable();
			longstack = null;
		}
		//如果业务代码自己监听了disconnect，则node-agent不处理
		if (!process.listeners('disconnect').filter(function(listener) {
			return listener !== disconnect;
		}).length) {
			process.removeListener('disconnect', disconnect);
			process.exit();
		}
	});

>如果是我们自己处理该事件，那么在处理完该事件后，请一定显示调用 `process.exit()` 以确保进程可以正常退出。


#### 5.2 uncaughtException事件

	// 其实现参见./ProcessContainer.js
	// Notify master that an uncaughtException has been catched
	process.on('uncaughtException', function uncaughtListener(err) {
		if (!process.listeners('uncaughtException').filter(function (listener) {
			return listener !== uncaughtListener;
		}).length) {
			process.removeListener('uncaughtListener', uncaughtListener);
			try {
				process.send({
					cmd : 'god:err',
					data : errorToString(err)
				});
			} catch(e) {}
			setTimeout(function() {
				process.exit(constants.CODE_UNCAUGHTEXCEPTION);
			}, 100);
		}
	});
	
>同理，如果是我们自己处理该事件，那么在处理完该事件后，请一定显示调用 `process.exit()` 以确保进程可以正常退出。

### 六、如何在TAF上执行定时任务
由于master进程不由我们掌控，我们的应用只是作为子进程在跑，所以在执行定时任务的时候会有些问题。
#### 6.1 单容器-单实例(进程)
如果是单容器&单进程的话，不会有一份任务被多次执行的情况出现，所以很好处理。这里简单以setInterval为例：

	setInterval(() => {
	  console.log('这是定时任务' + Date.now())
	}, 1000)

	2019-07-03 12:06:23|20058|DEBUG|app.js:98|这是定时任务1562126783726
	2019-07-03 12:06:24|20058|DEBUG|app.js:98|这是定时任务1562126784726
	2019-07-03 12:06:25|20058|DEBUG|app.js:98|这是定时任务1562126785726
	2019-07-03 12:06:26|20058|DEBUG|app.js:98|这是定时任务1562126786726
	2019-07-03 12:06:27|20058|DEBUG|app.js:98|这是定时任务1562126787726
	2019-07-03 12:06:28|20058|DEBUG|app.js:98|这是定时任务1562126788726
	2019-07-03 12:06:29|20058|DEBUG|app.js:98|这是定时任务1562126789727
	2019-07-03 12:06:30|20058|DEBUG|app.js:98|这是定时任务1562126790727

#### 6.2 单容器-多实例(进程)-根据workerid决定哪个实例跑

如果是单容器&多实例的话，虽然可能会存在一份任务被多次执行的情况出现，但是由于进程的id号是固定不变的，所以我们可以通过判断id的方式来确保定时任务只在某一个指定的进程上执行，同样以setInterval为例：

	setInterval(() => {
	  if (cluster.worker && cluster.worker.id === 1) {
	    console.log('这是定时任务' + cluster.worker.id)
	  }
	}, 1000)
	
	2019-07-03 12:02:35|19381|DEBUG|app.js:99|这是定时任务1
	2019-07-03 12:02:36|19381|DEBUG|app.js:99|这是定时任务1
	2019-07-03 12:02:37|19381|DEBUG|app.js:99|这是定时任务1
	2019-07-03 12:02:38|19381|DEBUG|app.js:99|这是定时任务1
	2019-07-03 12:02:39|19381|DEBUG|app.js:99|这是定时任务1
	
#### 6.3 多容器-多进程
如果在多容器&多进程的场景，上述方案就不能适应了，需要借助其它多进程模式下定时任务的方案了。