<template>
    <div rel="mainpage-card">
        <el-row :gutter="20">
          <el-col :span="8" v-for="(book, index) in books" :key="index">
              <div class="grid-content bg-purple" @click="handleLinkClicked(book.bookname_ch)">
                <el-tooltip effect="light" placement="top">
                  <div slot="content">
                  <span v-html="book.bookcomment"></span><a :href="book.bookname_en">这里</a></div>
                  <img :src='book.bookcover' width="100%" height="100%">
                </el-tooltip>
              </div>
          </el-col>
        </el-row>
    </div>
</template>

<script>
import book_typescript_jpg from '../img/book_typescript.jpg'
import book_chrome_jpg from '../img/book_chrome.jpg'
import book_es6_jpg from '../img/book_es6.jpg'
import book_es7_8_jpg from '../img/book_es7_8.jpg'
export default {
    name: 'mainpage-card',
    methods: {
        handleLinkClicked (title) {
          console.log(title)
            window.location = title;
        }
    },
    data () {
        return {
            books: [{
                bookname_ch: 'https://dulinrain.github.io/books/TypeScript编程指南.pdf',
                bookname_en: 'https://dulinrain.github.io/books/TypeScript JavaScript Development Guide.pdf',
                bookcomment: '1、该书由Dr. Axel Rauschmayer于2015年10月撰写，本人在2017年X月完成中文翻译<br/>2、该书介绍了ES6的新特性<br/>3、该书内容翔实，深入浅出，推荐指数&#9733;&#9733;&#9733;&#9733;&#9733;<br/>4、原书全文555页，中文译本xxx页。<br/>5、点击封面查看中文译本，查看原书请点击',
                bookcover: book_es6_jpg
            },{
                bookname_ch: 'https://dulinrain.github.io/books/TypeScript编程指南.pdf',
                bookname_en: 'https://dulinrain.github.io/books/TypeScript JavaScript Development Guide.pdf',
                bookcomment: '1、该书由Dr. Axel Rauschmayer于2017年撰写，本人在2017年7月完成中文翻译<br/>2、该书介绍了ECMAScript2016和ECMAScript2017的新特性<br/>3、因ECMAScript更新不多，故该书内容不多，推荐指数&#9733;&#9733;&#9733;&#9733;&#9733;<br/>4、原书为在线版，中文译本61页。<br/>5、点击封面查看中文译本，查看原书请点击',
                bookcover: book_es7_8_jpg
            },{
                bookname_ch: 'https://dulinrain.github.io/books/TypeScript编程指南.pdf',
                bookname_en: 'https://dulinrain.github.io/books/TypeScript JavaScript Development Guide.pdf',
                bookcomment: '1、该书由Nicholas Brown于2016年撰写，本人在2017年7月完成中文翻译<br/>2、该书介绍了TypeScript编程的基础知识<br/>3、该书内容太少，过于简化，推荐指数&#9733;<br/>4、建议想更全面深入的了解TypeScript编程的朋友移步<br/>5、原书全文114页，中文译本43页。<br/>6、点击封面查看中文译本，查看英文版原书请点击',
                bookcover: book_typescript_jpg
            },{
                bookname_ch: 'https://dulinrain.github.io/books/TypeScript编程指南.pdf',
                bookname_en: 'https://dulinrain.github.io/books/TypeScript JavaScript Development Guide.pdf',
                bookcomment: '1、该书由Prateek Mehta于2016年撰写，本人在2017年X月完成中文翻译<br/>2、该书介绍了开发Google Chrome扩展的方法<br/>3、该书对于Chrome扩展开发讲的非常细致，推荐指数&#9733;&#9733;&#9733;&#9733;&#9733;<br/>4、原书全文163页，中文译本xxx页。<br/>5、点击封面查看中文译本，查看原书请点击',
                bookcover: book_chrome_jpg
            }]
        }
    }
}
</script>

<style scoped>
  .el-row {
    margin-bottom: 20px;
  }
  .el-row:last-child {
    margin-bottom: 0;
  }
  .el-col {
    border-radius: 4px;
    margin-bottom: 20px;
  }
  .el-col:last-child {
    margin-bottom: 0;
  }
  .bg-purple-dark {
    background: #99a9bf;
  }
  .bg-purple {
    background: #d3dce6;
  }
  .bg-purple-light {
    background: #e5e9f2;
  }
  .grid-content {
    border-radius: 4px;
    min-height: 36px;
    height: 360px;
  }
  .row-bg {
    padding: 10px 0;
    background-color: #f9fafc;
  }
  img:hover{
    cursor: pointer;
  }
</style>
