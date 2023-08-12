# 多个浏览器已开始支持import maps
多个主流浏览器都支持了一种新的使用ES模块的方式：<script type="importmap">，这个tag可以让我们定义外部模块的名字和对应的URL映射，这样在使用模块的时候会很方便，并且保持了和历史使用模块方式的一致性。
```ts
<script type="importmap">
  {
    "imports": {
      "browser-fs-access": "https://unpkg.com/browser-fs-access@0.33.0/dist/index.modern.js
    }
  }
</script>
```
上面这个代码定义了个外部模块browser-fs-access以及它的地址。有了这样的定义，我们可以在使用时直接import模块的名字：
```ts
<button>Select a text file</button>
<script type="module">
  import {fileOpen} from 'browser-fs-access';
  //import {fileOpen} from "https://unpkg.com/browser-fs-access@0.33.0/dist/index.modern.js" 旧的方式

  const button = document.querySelector('button');
  button.addEventListener('click', async () => {
    const file = await fileOpen({
      mimeTypes: ['text/plain'],
    });
    console.log(await file.text());
  });
</script>
```
相比于旧的方式，新的方式会更加简洁，并且与我们的常规写法较为一致。
这里的URL既可以是相对地址，也可以是绝对的。相对的话就是相对当前。比如：
```ts
<script type="importmap">
{
  "imports": {
    "lodash": "/node_modules/lodash-es/lodash.js" // 整体引入
    "lodash/map": "/node_modules/lodash/map.js", // 部分引入
    "lodash/": "/node_modules/lodash/" // 部分引入
  }
}
</script>

<script type="module">
  import _lodash from "lodash";
  import map from "lodash/map";// or import map from "lodash/map.js"
  // or import a specific moodule
  import _shuffle from "lodash/shuffle.js";
</script>
```
浏览器支持情况如下：
