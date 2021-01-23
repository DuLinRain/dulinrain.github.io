# 每天学一个npm包——co-body
在学习[co-body](https://github.com/cojs/co-body)之前，我们先回顾一下`http`流的传输过程，客户端向服务端发送请求，这个请求头里会带有`Content-Type`，用于标识我们的内容的类型，以及`Content-Encoding`，用于标识我们的消息体的压缩编码方式。

服务端在收到请求流后，根据根据`Content-Type`的类型来决定按文件解析还是按text/form/json等格式解析。在koa-body的实现里，如果请求是文件类型，则通过[formidable](https://github.com/node-formidable/node-formidable)来处理，如果是text/form/json等类型，则通过[co-body](https://github.com/cojs/co-body)来处理。

而[co-body](https://github.com/cojs/co-body)实际上依赖于[raw-body](https://github.com/stream-utils/raw-body)将流消费完后得到的结果。[co-body](https://github.com/cojs/co-body)所做的事情主要是根据不同的`Content-Type`(`application/x-www-urlencoded`, `application/json`, `text/plain`)，将[raw-body](https://github.com/stream-utils/raw-body)的结果parse成对应的格式的数据，交个下一级`koa-body`，最终`koa-body`将其挂载在`ctx.req.body`上。我们这篇文章主要关注的是[co-body](https://github.com/cojs/co-body)这一步所做的工作。

[co-body](https://github.com/cojs/co-body)在整个流程中的位置如下：

![](https://raw.githubusercontent.com/DuLinRain/pictures/master/co-body.png)

### 一、用法
[co-body](https://github.com/cojs/co-body)的用法很简单，主要是提供了分别对应几种`Content-Type`的解析方法：

	var parse = require('co-body')
	// application/json
	var body = await parse.json(this);// 这里面的this都是指ctx.req
	
	// application/x-www-form-urlencoded
	var body = await parse.form(this);
	
	// text/plain
	var body = await parse.text(this);
	
	// either
	var body = await parse(this);

### 二、源码实现
[co-body](https://github.com/cojs/co-body)的源码实现也很清晰明了，分别由一个入口index.js文件和对应几种`Content-Type`的解析文件组成， 目录结构如下：

	- index.js	// export入口
	- lib
	   utils.js	
	   form.js	    // application/x-www-urlencode
	   text.js		// application/json
	   json.js		// text/plain
	   any.js       // 处理不支持的`Content-Type`

#### 2.1 index.js
[index.js](https://github.com/cojs/co-body/blob/master/index.js)是入口文件，主要是把各个模块的实现导出来：

	exports = module.exports = require('./lib/any');
	exports.json = require('./lib/json');
	exports.form = require('./lib/form');
	exports.text = require('./lib/text');

#### 2.2 text.js
[text.js](https://github.com/cojs/co-body/blob/master/lib/text.js)主要用来处理是`text/plain`的情形，由于raw-body的到的已经是string类型的body了，所以`text.js`几乎就是原封不动的将`raw-body`的结果吐出去了：

	const raw = require('raw-body');
	const inflate = require('inflation');
	const utils = require('./utils');
	
	module.exports = async function(req, opts) {
	  req = req.req || req;
	  opts = utils.clone(opts);
	
	  // defaults
	  const len = req.headers['content-length'];
	  const encoding = req.headers['content-encoding'] || 'identity';
	  if (len && encoding === 'identity') opts.length = ~~len;
	  opts.encoding = opts.encoding === undefined ? 'utf8' : opts.encoding;
	  opts.limit = opts.limit || '1mb';
	
	  const str = await raw(inflate(req), opts);
	  // ensure return the same format with json / form
	  return opts.returnRawBody ? { parsed: str, raw: str } : str;//直接把raw-body的结果返回回去了
	};
	
#### 2.3 form.js
[form.js](https://github.com/cojs/co-body/blob/master/lib/form.js)主要用来处理是`application/x-www-urlencoded`的情形，由于raw-body得到的是string类型的body了，所以`form.js`需要将它进行转换, 这里使用的是[qs](https://www.npmjs.com/package/qs)包进行转换的：

	const raw = require('raw-body');
	const inflate = require('inflation');
	const qs = require('qs');
	const utils = require('./utils');
	module.exports = async function(req, opts) {
	  req = req.req || req;
	  opts = utils.clone(opts);
	  const queryString = opts.queryString || {};
	
	  // keep compatibility with qs@4
	  if (queryString.allowDots === undefined) queryString.allowDots = true;
	
	  // defaults
	  const len = req.headers['content-length'];
	  const encoding = req.headers['content-encoding'] || 'identity';
	  if (len && encoding === 'identity') opts.length = ~~len;
	  opts.encoding = opts.encoding || 'utf8';
	  opts.limit = opts.limit || '56kb';
	  opts.qs = opts.qs || qs;
	
	  const str = await raw(inflate(req), opts);
	  try {
	    const parsed = opts.qs.parse(str, queryString); // 使用qs包进行转换
	    return opts.returnRawBody ? { parsed, raw: str } : parsed;
	  } catch (err) {
	    err.status = 400;
	    err.body = str;
	    throw err;
	  }
	};
	
	
#### 2.4 json.js
[json.js](https://github.com/cojs/co-body/blob/master/lib/json.js)主要用来处理是`application/json`的情形，和[form.js](https://github.com/cojs/co-body/blob/master/lib/form.js)类似，不同之处是他使用的是`JSON.parse`进行转换的：

	const raw = require('raw-body');
	const inflate = require('inflation');
	const utils = require('./utils');
	
	// Allowed whitespace is defined in RFC 7159
	// http://www.rfc-editor.org/rfc/rfc7159.txt
	const strictJSONReg = /^[\x20\x09\x0a\x0d]*(\[|\{)/;
	module.exports = async function(req, opts) {
	  req = req.req || req;
	  opts = utils.clone(opts);
	
	  // defaults
	  const len = req.headers['content-length'];
	  const encoding = req.headers['content-encoding'] || 'identity';
	  if (len && encoding === 'identity') opts.length = ~~len;
	  opts.encoding = opts.encoding || 'utf8';
	  opts.limit = opts.limit || '1mb';
	  const strict = opts.strict !== false;
	
	  const str = await raw(inflate(req), opts);
	  try {
	    const parsed = parse(str);
	    return opts.returnRawBody ? { parsed, raw: str } : parsed;
	  } catch (err) {
	    err.status = 400;
	    err.body = str;
	    throw err;
	  }
	
	  function parse(str) {
	    if (!strict) return str ? JSON.parse(str) : str;//使用JSON.parse解析
	    // strict mode always return object
	    if (!str) return {};
	    // strict JSON test
	    if (!strictJSONReg.test(str)) {
	      throw new Error('invalid JSON, only supports object and array');
	    }
	    return JSON.parse(str);
	  }
	};
	
#### 2.5 any.js
[any.js](https://github.com/cojs/co-body/blob/master/lib/any.js)主要是处理不支持的`Content-Type`，这种情况下会返回415：

	const typeis = require('type-is');
	const json = require('./json');
	const form = require('./form');
	const text = require('./text');
	
	const jsonTypes = [ 'json', 'application/*+json', 'application/csp-report' ];
	const formTypes = [ 'urlencoded' ];
	const textTypes = [ 'text' ];
	
	module.exports = async function(req, opts) {
	  req = req.req || req;
	  opts = opts || {};
	
	  // json
	  const jsonType = opts.jsonTypes || jsonTypes;
	  if (typeis(req, jsonType)) return json(req, opts);
	
	  // form
	  const formType = opts.formTypes || formTypes;
	  if (typeis(req, formType)) return form(req, opts);
	
	  // text
	  const textType = opts.textTypes || textTypes;
	  if (typeis(req, textType)) return text(req, opts);
	
	  // invalid
	  const type = req.headers['content-type'] || '';
	  const message = type ? 'Unsupported content-type: ' + type : 'Missing content-type';
	  const err = new Error(message);
	  err.status = 415;
	  throw err;
	};