# webpack模块联邦——动态remote

webpack模块联邦的用法里，当使用导出的远程模块时，通常是像类似于下面这样写的：

	module.exports = {
	  plugins: [
	    new ModuleFederationPlugin({
	      name: 'host',
	      remotes: {
	        app1: 'app1@http://xxxxx/remoteEntry.js',
	      },
	    }),
	  ],
	};
	
但是，这样的写法也有局限性，因为这写的话，地址是写死的，我们加载的原创资源是固定的。当我们新增一个远程依赖时，可能需要使用这些远程资源的工程重新修改联邦remote配置，然后发版。这不是我们想要的效果。我们在实际场景中其实是希望动态远程加载模块的。

也就是说，期望这个remote是动态的，直接可以在运行时进行控制，这通常应该如何实现呢？

### 方式一：基于 Promise 的动态 Remote
实现动态remote的方式一是「**基于 Promise 的动态 Remote**」。也就是在配置remote时不要写死地址，直接写一个Promise的string。这段逻辑会在运行时执行，可以获取一些基本的参数。可以根据这些参数动态构造我们的remote地址，这样就实现了动态remote。

但是你也可以向 remote 传递一个 promise，其会在运行时被调用。你应该用任何符合上面描述的 get/init 接口的模块来调用这个 promise。例如，如果你想传递你应该使用哪个版本的联邦模块，你可以通过一个查询参数做以下事情：

	module.exports = {
	  plugins: [
	    new ModuleFederationPlugin({
	      name: 'host',
	      remotes: {
	        app1: `promise new Promise(resolve => {
	      const urlParams = new URLSearchParams(window.location.search)
	      const version = urlParams.get('app1VersionParam')
	      // This part depends on how you plan on hosting and versioning your federated modules
	      const remoteUrlWithVersion = 'http://localhost:3001/' + version + '/remoteEntry.js'
	      const script = document.createElement('script')
	      script.src = remoteUrlWithVersion
	      script.onerror = (err) => {
	      resolve({
	        get: () => null,
	        init: () => null
	      })
	    }
	      script.onload = () => {
	        // the injected script has loaded and is available on window
	        // we can now resolve this Promise
	        const proxy = {
	          get: (request) => window.app1.get(request),
	          init: (arg) => {
	            try {
	              return window.app1.init(arg)
	            } catch(e) {
	              console.log('remote container already initialized')
	            }
	          }
	        }
	        resolve(proxy)
	      }
	      // inject this script with the src set to the versioned remoteEntry.js
	      document.head.appendChild(script);
	    })
	    `,
	      },
	      // ...
	    }),
	  ],
	};
	
但是这种方式也存在一定的缺陷，就是当我们仅仅能够在应用加载的时候实现一次动态remote资源的控制，当我们想再次去控制加载这个动态remote时候就不行了。

### 方式二：动态远程容器


另外一种动态remote的方式则灵活许多，它也是官方提供的动态远程容器方案。具体的用法如下：

	function loadComponent(scope, module) {  
	    return async () => {    
	    // Initializes the shared scope. Fills it with known provided modules from this build and all remotes    
	    await __webpack_init_sharing__("default");    
	    const container = window[scope]; // or get the container somewhere else    
	    // Initialize the container, it may provide shared modules    
	    await container.init(__webpack_share_scopes__.default);    
	    const factory = await window[scope].get(module);    
	    const Module = factory();    return Module;  
	    };
	}
	loadComponent("your scope", "you component");
	
> 该容器接口支持 `get` 和 `init` 方法。 `init` 是一个兼容 `async` 的方法，调用时，只含有一个参数：共享作用域对象(shared scope object)。此对象在远程容器中用作共享作用域，并由 host 提供的模块填充。 可以利用它在运行时动态地将远程容器连接到 host 容器。https://webpack.docschina.org/concepts/module-federation/#dynamic-remote-containers	
	
这里面`your scope`代表你在配置模块联邦时的`name`字段，而`you component`则是你配置的`exposes`字段中的一个个key，即一个个导出的组件名。比如下面的配置对应`loadComponent("comic", "XKCD")` 或 `loadComponent("comic", "./XKCD")`：

	new ModuleFederationPlugin({
	  name: "comic",
	  filename: "remoteEntry.js",
	  exposes: {
	    "./XKCD": "./app.jsx",
	  },
	  shared: [
	    {
	      react: { singleton: true, eager: true },
	      "react-dom": { singleton: true, eager: true },
	    },
	  ],
	}),
	
	
使用上面的方式可以在你的代码中随时随地地动态加载remote。使用方式分2步：

#### 第一步：将你的remote资源插入到页面：

	// 这个insertJs可以自己实现
	export function insertJs(urls = '', cb?: any) {
	  if (Array.isArray(urls)) {
	    return Promise.all(
	      urls.map((url) => {
	        return new Promise(function (resolve, reject) {
	          const script = document.createElement('script');
	          script.type = 'text/javascript';
	          script.src = url;
	          document.querySelector('head')?.appendChild(script);
	          script.onload = function () {
	            resolve(cb && cb());
	          };
	          script.onerror = function () {
	            reject('js加载失败');
	          };
	        });
	      })
	    );
	  }
	  return new Promise(function (resolve, reject) {
	    const script = document.createElement('script');
	    script.type = 'text/javascript';
	    script.src = urls;
	    document.querySelector('head')?.appendChild(script);
	    script.onload = function () {
	      resolve(cb && cb());
	    };
	    script.onerror = function () {
	      reject('js加载失败');
	    };
	  });
	}
	
	insertJs("http://xxx/xxx/xxx/youremoteEntry.js"); // 这里可以插入你任意的remote
	
	
#### 第二步：加载remote组件

	const Comp = React.lazy(loadComponent('comic', './XKCD')) // 或者用其它lazy的方式load这个组件
	
	
### 理解动态远程容器
前面提到，动态远程容器的核心是下面这个代码：

	function loadComponent(scope, module) {  
	    return async () => {    
	    // Initializes the shared scope. Fills it with known provided modules from this build and all remotes    
	    await __webpack_init_sharing__("default");    
	    const container = window[scope]; // or get the container somewhere else    
	    // Initialize the container, it may provide shared modules    
	    await container.init(__webpack_share_scopes__.default);    
	    const factory = await window[scope].get(module);    
	    const Module = factory();    return Module;  
	    };
	}
	
那这里面以**`__webpack_`**开头的都是啥含义呢？

**`__webpack_init_sharing__ `**实际定义为：


	{        
	
	    __webpack_init_sharing__: {                
	    expr: RuntimeGlobals.initializeSharing,                
	    req: [RuntimeGlobals.initializeSharing],                
	    type: "function",                
	    assign: true  
	    }
	}

其中，**`RuntimeGlobals.intiialzeSharing`** 被导出为：

	/** * The sharing init sequence function (only runs once per share scope). * Has one argument, the name of the share scope. * Creates a share scope if not existing */
	exports.initializeSharing = "__webpack_require__.I";


**`__webpack_share_scopes`** 定义为：

	{        
	    __webpack_share_scopes__: {                
	        expr: RuntimeGlobals.shareScopeMap,                
	        req: [RuntimeGlobals.shareScopeMap],                
	        type: "object",                
	        assign: false  
	   }
	}

**`shareScopeMap`** 则可能是

	/** * an object with all share scopes */
	exports.shareScopeMap = "__webpack_require__.S";

**`__webpack_share_scopes__.default `**则对应你配置的`share`，比如可能被解析为

	{    
	    "react-dom": {        
	        "17.0.2": {            
	            "from": "home-app",            
	            "eager": true,            
	            "loaded": 1        
	        }    
	    },    
	    "react": {        
	        "17.0.2": {            
	            "from": "home-app",            
	            "eager": true,            
	            "loaded": 1        
	        }    
	    }
	}


### 参考
- [Module Federation | webpack 中文文档](https://webpack.docschina.org/concepts/module-federation/)
- [模块联邦之动态远程](https://h3manth.com/posts/dynamic-remotes-webpack-module-federation/)
- [动态远程容器在线示例](https://codesandbox.io/s/dynamic-remotes-webpack-module-federation-o51ho?from-embed=&file=/home/app.jsx)
