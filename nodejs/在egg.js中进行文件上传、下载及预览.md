# 在egg.js中进行文件上传、下载及预览

### 文件上传
egg同时支持form-data和stream形式的文件上传，可以通过mode指定支持哪种模式，如果需要同时支持，需要以`fileModeMatch`字段指定。比如下面配置表示：除符合`/^\/maccountsetting\/smallVideoAgency\/`规则的接口走form-data模式外，其它都走stream模式。

	config.multipart = {
	        mode: 'stream', // 以stream形式上传
	        fileModeMatch: /^\/maccountsetting\/smallVideoAgency\/UploadBusinessIntroAttachment$/,
	        fileSize: '5mb', // 大小限制5M
	        whitelist: [ // 支持：jpg、jpeg、png格式
	            '.png',
	            '.jpg',
	            '.jpeg',
	            '.pdf'
	        ],
	    };
	    
#### 前端form-data上传到接入层，接入层stream传给其它服务

	async UploadBusinessIntroAttachment() {
	    const { ctx } = this;
	    try {
	        ctx.apiId = ctx.genId();
	        const file = ctx.request.files[0];// form-data形式的话，从ctx.request.files取文件信息
	        if (!file) {
	            throw new Error('从ctx.request.files中未取到文件');
	        }
	        // curl是egg自带的包，实际上是urllib
	        const result = await ctx.curl(`${ctx.app.config.talentfiledomain}/api/uploadBusinessIntroAttachment`, {
	            method: 'POST',
	            dataType: 'json',
	            // 其它参数
	            data: {
	                uploader: Number(ctx.mediaid),
	                file_name: file.filename,
	            },
	            files: {
	                file_data: fs.createReadStream(file.filepath)//从临时目录读取文件，以流的形式传给后台
	            }
	        });
	        let { code, msg, data = {}} = result.data;
	        if (code === 0) {
	            data.url = `${ctx.protocol}://${ctx.hostname}${ctx.app.config.prefix}/smallVideoAgency/previewBusinessIntroAttachment?attachment_id=${data.attachment_id}`;
	            ctx.data = data;
	        } else {
	            ctx.code = code;
	            ctx.msg = msg;
	        }
	        console.log('result===', result);
	    } catch (e) {
	        ctx.code = -1;
	        ctx.msg = '接口异常，请稍后再试';
	        ctx.fulllog.error(`${ctx.href}页面接口出错`, e);
	    }
	}

#### 前端stream上传到接入层，接入层stream传给其它服务

未完待续。

#### 接入层以jce形式传给后台(buffer形式)
以jce形式约定文件上传时候，通常文件数据格式是`vector<byte>`这种格式，其实就是buffer的格式。所以接入层在收到上传的数据后，需要把数据转换成buffer的形式传过去。

### 敏感图片展示
有的时候，在用户上传身份证等资料进行认证的时候，这些图片会被视为敏感信息，所以在用户在上传完后展示的是一个占位图。这个占位图并不是一个实际的图片资源，实际上是一个接口。当img标签加载这个图片的时候，实际上是向这个接口发送请求，这个接口里把占位图的数据返回回来：

	let url = 'http://inews.gtimg.com/newsapp_ls/0/6937884064/0';//占位图
    let result = await new Promise((resolve, reject) => {
        let responseData = [];// 存储文件流
        let stream = request(url);
        ctx.fulllog.log('stream==', stream);
        stream.on('data', function (chunk) {
            responseData.push(chunk);
        });
        stream.on('end', function() {
            let finalData = Buffer.concat(responseData);
            resolve(finalData);
        });
        stream.on('error', function(e) {
            reject(e);
        });
    });
    ctx.set('Content-Type', 'application/oct-stream');
    // ctx.set('Accept-Ranges', 'bytes');
    ctx.set('Content-Disposition', 'attachment; filename=newqrcode.png');
    ctx.body = result;


### 文件下载
比如我们可能会遇到下面这种场景：


也就是说，图片上传到cdn上去了，在页面展示。然后附近有一个下载按钮。希望的效果是下载该图片，而不是在浏览器中打开该图片。

如果是图片地址和我们的网站处在同一个域下的话，我们可以使用HTML原生的download属性实现在当前页面下载该图片，只需要做如下操作：

	<a href="/images/xxx" download="fielname">
	
具体实例可以参考：https://www.w3school.com.cn/tiy/t.asp?f=html_a_download

但是，上面这种方式存在一些限制：

1. 只能是同域下
2. 兼容性有问题

![](https://img2018.cnblogs.com/blog/1304966/201810/1304966-20181031155947873-1980081013.png)

所以，我们需要采用另外一种方式实现图片下载。这里我们可以提供一个图片下载的接口，用户点下载后调用这个接口，把图片的url传过去，由服务端请求相应的图片内容，将内容吐给浏览器。 这里关键的是需要设置`Content-Type`和`Content-Disposition`这两个header, 具体实例如下：


	let request = require('request');
	const { qrcode = '' } = ctx.query;
	if (!(qrcode.startsWith('http://inews.gtimg.com/') || qrcode.startsWith('https://inews.gtimg.com/'))) {
	    throw new Error('down qrcode error!');
	}
	let result = await new Promise((resolve, reject) => {
	    let responseData = [];// 存储文件流
	    let stream = request(qrcode);
	    stream.on('data', function (chunk) {
	        responseData.push(chunk);
	    });
	    stream.on('end', function() {
	        let finalData = Buffer.concat(responseData);
	        resolve(finalData);
	    });
	    stream.on('error', function(e) {
	        reject(e);
	    });
	});
	ctx.set('Content-Type', 'application/oct-stream');
	ctx.set('Content-Disposition', 'attachment; filename=newqrcode.png');
	ctx.body = result;

`Content-disposition` 是 MIME 协议的扩展，MIME 协议指示 MIME 用户代理如何显示附加的文件。
`Content-disposition`其实可以控制用户请求所得的内容存为一个文件的时候提供一个默认的文件名(`filename=xxx`)，文件直接在浏览器上显示（不设置`attachment; `）或者在访问时弹出文件下载(设置`attachment;`)对话框。
	
### PDF文件预览
通常我们在上次完某个文件后会给一个链接让用户下载或预览文件，但这个链接并不是一个实际的文件存储位置，如：

	https://xxx.xxx.xxx/xxx/xxx?fileid=xxx
	
这个链接实际上是一个接口，接入层根据query中的filedid去获取实际的文件内容，并吐给前端。而对于PDF预览来说，它其实本身也是一个文件下载的思路，区别在于这里只需要设置`Content-Type`头，无需设置`Content-disposition`, 当然你也可以设置`Content-disposition`，但是不能指定`attachment; `属性。 

实例：

	async PreviewBusinessIntroAttachment() {
        const { ctx } = this;
        try {
            ctx.apiId = ctx.genId();
            let { attachment_id } = ctx.query;
            if (!attachment_id) {
                throw new Error('无此文件！');
            }
            let url = `${ctx.app.config.talentfiledomain}/api/downloadBusinessIntroAttachment?attachment_id=${attachment_id}&uploader=${Number(ctx.mediaid)}`;
            let result = await new Promise((resolve, reject) => {
                let responseData = [];// 存储文件流
                let stream = request(url);
                stream.on('data', function (chunk) {
                    responseData.push(chunk);
                });
                stream.on('end', function() {
                    let finalData = Buffer.concat(responseData);
                    resolve(finalData);
                });
                stream.on('error', function(e) {
                    reject(e);
                });
            });
            ctx.set('Content-Type', 'application/pdf');
            ctx.body = result;
        } catch (e) {
            ctx.code = -1;
            ctx.msg = '接口异常，请稍后再试';
            ctx.fulllog.error(`${ctx.href}页面接口出错`, e);
        }
    }