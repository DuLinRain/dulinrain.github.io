# 每天学习一个node包之mime


mime（https://www.npmjs.com/package/mime）是一个node包，提供了文件扩展名 和 http头`Content-Type`的一一映射，如果你需要处理文件上传相关的工作，这会非常有帮助。eggjs的urllib包在处理文件上传时也使用了mime这个包来设置`Content-Type`。

### 主要功能

`mime`主要提供2个API：

1. mime.getType(pathOrExtension) 通过路径或扩展名查mime type
2. mime.getExtension(type) 通过mime type查扩展名

#### mime.getType(pathOrExtension)


	mime.getType('js');             // ⇨ 'application/javascript'
	mime.getType('json');           // ⇨ 'application/json'
	 
	mime.getType('txt');            // ⇨ 'text/plain'
	mime.getType('dir/text.txt');   // ⇨ 'text/plain'
	mime.getType('dir\\text.txt');  // ⇨ 'text/plain'
	mime.getType('.text.txt');      // ⇨ 'text/plain'
	mime.getType('.txt');           // ⇨ 'text/plain'
	
#### mime.getExtension(type)

	mime.getExtension('text/plain');               // ⇨ 'txt'
	mime.getExtension('application/json');         // ⇨ 'json'
	mime.getExtension('text/html; charset=utf8');  // ⇨ 'html'
	
### 源码实现
正如上面所述，mime主要实现扩展名和mime type的相互隐射查找，所以源码实现也比较简单：

	var Mime = require('./Mime');
	module.exports = new Mime(require('./types/standard'), require('./types/other'));
	
其中：

`Mime.js`是API的实现部分，提供上述2个接口

而`./types/standard` 和 `./types/other` 则存放的是标准mime type和扩展的mime-type的隐射表, 其内容大致类似如下：

	{ 
		"application/andrew-inset":["ez"],
		"application/applixware":["aw"],
		"application/atom+xml":["atom"],
		// ...
	}