<template>
  <div id="app">
    <el-row :gutter="20">
      <el-col :span="24">
        <header>
            <svg xmlns="http://www.w3.org/2000/svg"
              xml:lang="en"
              width="100%" height="0.75in">
              <title>Formatting Text Spans</title>
              <text x="10%" y="0.2in" aling="center" transform="scale(3,3)">
                <tspan fill="royalBlue" stroke="navy">DuLinRain 的博客</tspan>
              </text>
            </svg>
        </header>
      </el-col>
    </el-row>
    <el-row :gutter="20">
      <el-col :span="24" >
          <div class="motto">
            <svg xmlns="http://www.w3.org/2000/svg"
              xml:lang="en"
              width="100%" height="0.6in">
              <title>Formatting Text Spans</title>
              <text x="0in" y="0.2in" >
                <tspan fill="royalBlue" stroke="#333"
              >我一生的嗜好，除了写代码混口饭吃之外就是读书。我一天不读书，就不能够生活！</tspan>
              </text>
              <text x="72%" dy="0.5in" >
                <tspan fill="royalBlue" stroke="#333"
              >————By DuLinRain in SVG</tspan>
              </text>
            </svg>
          </div>
      </el-col>
    </el-row>
    <el-tabs v-model="activeName" @tab-click="handleClick">
      <el-tab-pane label="博客首页" name="carousel">
          <mainpage-carousel :articles="articlesWithIndex"/>
      </el-tab-pane>
      <el-tab-pane label="所有文章" name="table">
          <mainpage-table :articles="articlesWithIndex"/>
      </el-tab-pane>
      <el-tab-pane label="列表式" name="list">
          <mainpage-list :articles="articlesWithIndex"/>
      </el-tab-pane>
      <el-tab-pane label="翻译书籍" name="card">
          <mainpage-card :articles="articlesWithIndex"/>
      </el-tab-pane>
    </el-tabs>
    <el-row :gutter="20">
      <footer>© 1991—2017 DuLinRain</footer>
    </el-row>
  </div>
</template>

<script>
import mainpageCarousel from './vue/mainpage-carousel.vue'
import mainpageCard from './vue/mainpage-card.vue'
import mainpageList from './vue/mainpage-list.vue'
import mainpageTable from './vue/mainpage-table.vue'
export default {
    components: {
        'mainpage-carousel': mainpageCarousel,
        'mainpage-card': mainpageCard,
        'mainpage-list': mainpageList,
        'mainpage-table': mainpageTable
    },
    created () {
        // console.log(this.articles)
        // console.log(this.test)
        // console.log(this.test1)
        // Object.assign(this.test,this.test1)
        // console.log(this.test)
        // console.log(this.test1)
    },
    mounted () {
        // console.log(this.articles)
    },
    computed: {
      articlesWithIndex () {
        for (let i of this.articles.keys()) {
            this.articles[i].index = i + 1
        }
        // console.log(this.articles)
        return this.articles
      }
    },
    data() {
      return {
        activeName: 'carousel',
        test: {name: 1},
        test1: {name: 2},
        articles:[{
              title:'JavaScript字符集之一坨翔引发的血案',
              tags:['JavaScript','Unicode'],
              link:'./basic-javascript/JavaScript字符集之一坨翔引发的血案.html',
              date:'2017-04-13',
              creator: 'DuLinRain',
              category: 'basic-javascript'
          }, {
              title:'JavaScript字符集之合法变量名',
              tags:['JavaScript','Unicode'],
              link:'./basic-javascript/JavaScript字符集之合法变量名.html',
              date:'2017-04-14',
              creator: 'DuLinRain',
              category: 'basic-javascript'
          }, {
              title:'JavaScript字符集之合法属性名',
              tags:['JavaScript','Unicode'],
              link:'./basic-javascript/JavaScript字符集之合法属性名.html',
              date:'2017-04-15',
              creator: 'DuLinRain',
              category: 'basic-javascript'
          }, {
              title:'JavaScript基础知识之间相关函数详解',
              tags:['JavaScript','时间函数'],
              link:'./basic-javascript/JavaScript基础知识之间相关函数详解.html',
              date:'2017-06-10',
              creator: 'DuLinRain',
              category: 'basic-javascript'
          }, {
              title:'Web安全之跨站脚本攻击(XSS)实战',
              tags:['Web安全','XSS'],
              link:'./web-security/Web安全之跨站脚本攻击(XSS)实战.html',
              date:'2017-05-31',
              creator: 'DuLinRain',
              category: 'web-security'
          }, {
              title:'Web安全之SQL注入实战',
              tags:['Web安全','XSS'],
              link:'./web-security/Web安全之SQL注入实战.html',
              date:'2017-05-31',
              creator: 'DuLinRain',
              category: 'web-security'
          }, {
              title:'Web安全之弱口令实战',
              tags:['Web安全','XSS'],
              link:'./web-security/Web安全之弱口令实战.html',
              date:'2017-05-31',
              creator: 'DuLinRain',
              category: 'web-security'
          }, {
              title:'JavaScript基础知识之继承(类继承和原型继承)',
              tags:['JavaScript'],
              link:'./basic-javascript/JavaScript基础知识之继承(类继承和原型继承).html',
              date:'2017-05-13',
              creator: 'DuLinRain',
              category: 'basic-javascript'
          }, {
              title:'JavaScript设计模式（创建型）之工厂模式',
              tags:['JavaScript','设计模式'],
              link:'./javascript-design-pattern/JavaScript设计模式（创建型）之工厂模式.html',
              date:'2017-05-13',
              creator: 'DuLinRain',
              category: 'javascript-design-pattern'
          }, {
              title:'JavaScript设计模式（创建型）之生成器模式',
              tags:['JavaScript','设计模式'],
              link:'./javascript-design-pattern/JavaScript设计模式（创建型）之生成器模式.html',
              date:'2017-05-13',
              creator: 'DuLinRain',
              category: 'javascript-design-pattern'
          }, {
              title:'JavaScript设计模式（创建型）之原型模式',
              tags:['JavaScript','设计模式'],
              link:'./javascript-design-pattern/JavaScript设计模式（创建型）之原型模式.html',
              date:'2017-05-13',
              creator: 'DuLinRain',
              category: 'javascript-design-pattern'
          }, {
              title:'JavaScript设计模式（创建型）之单体模式',
              tags:['JavaScript','设计模式'],
              link:'./javascript-design-pattern/JavaScript设计模式（创建型）之单体模式.html',
              date:'2017-05-13',
              creator: 'DuLinRain',
              category: 'javascript-design-pattern'
          }, {
              title:'JavaScript设计模式（结构型）之适配器模式',
              tags:['JavaScript','设计模式'],
              link:'./javascript-design-pattern/JavaScript设计模式（结构型）之适配器模式.html',
              date:'2017-05-14',
              creator: 'DuLinRain',
              category: 'javascript-design-pattern'
          }, {
              title:'JavaScript设计模式（结构型）之门面模式',
              tags:['JavaScript','设计模式'],
              link:'./javascript-design-pattern/JavaScript设计模式（结构型）之门面模式.html',
              date:'2017-05-14',
              creator: 'DuLinRain',
              category: 'javascript-design-pattern'
          }, {
              title:'JavaScript设计模式（结构型）之装饰者模式',
              tags:['JavaScript','设计模式'],
              link:'./javascript-design-pattern/JavaScript设计模式（结构型）之装饰者模式.html',
              date:'2017-05-14',
              creator: 'DuLinRain',
              category: 'javascript-design-pattern'
          }, {
              title:'JavaScript设计模式（结构型）之组合模式',
              tags:['JavaScript','设计模式'],
              link:'./javascript-design-pattern/JavaScript设计模式（结构型）之组合模式.html',
              date:'2017-05-14',
              creator: 'DuLinRain',
              category: 'javascript-design-pattern'
          }, {
              title:'JavaScript设计模式（结构型）之享元模式',
              tags:['JavaScript','设计模式'],
              link:'./javascript-design-pattern/JavaScript设计模式（结构型）之享元模式.html',
              date:'2017-05-14',
              creator: 'DuLinRain',
              category: 'javascript-design-pattern'
          }, {
              title:'JavaScript设计模式（结构型）之掺合模式',
              tags:['JavaScript','设计模式'],
              link:'./javascript-design-pattern/JavaScript设计模式（结构型）之掺合模式.html',
              date:'2017-05-14',
              creator: 'DuLinRain',
              category: 'javascript-design-pattern'
          }, {
              title:'JavaScript设计模式（结构型）之模块模式',
              tags:['JavaScript','设计模式'],
              link:'./javascript-design-pattern/JavaScript设计模式（结构型）之模块模式.html',
              date:'2017-05-14',
              creator: 'DuLinRain',
              category: 'javascript-design-pattern'
          }, {
              title:'JavaScript设计模式（结构型）之代理模式',
              tags:['JavaScript','设计模式'],
              link:'./javascript-design-pattern/JavaScript设计模式（结构型）之代理模式.html',
              date:'2017-05-14',
              creator: 'DuLinRain',
              category: 'javascript-design-pattern'
          }, {
              title:'JavaScript设计模式（行为型）之职责链模式',
              tags:['JavaScript','设计模式'],
              link:'./javascript-design-pattern/JavaScript设计模式（行为型）之职责链模式.html',
              date:'2017-05-20',
              creator: 'DuLinRain',
              category: 'javascript-design-pattern'
          }, {
              title:'JavaScript设计模式（行为型）之命令模式',
              tags:['JavaScript','设计模式'],
              link:'./javascript-design-pattern/JavaScript设计模式（行为型）之命令模式.html',
              date:'2017-05-20',
              creator: 'DuLinRain',
              category: 'javascript-design-pattern'
          }, {
              title:'JavaScript设计模式（行为型）之迭代器模式',
              tags:['JavaScript','设计模式'],
              link:'./javascript-design-pattern/JavaScript设计模式（行为型）之迭代器模式.html',
              date:'2017-05-20',
              creator: 'DuLinRain',
              category: 'javascript-design-pattern'
          }, {
              title:'JavaScript设计模式（行为型）之观察者模式',
              tags:['JavaScript','设计模式'],
              link:'./javascript-design-pattern/JavaScript设计模式（行为型）之观察者模式.html',
              date:'2017-05-20',
              creator: 'DuLinRain',
              category: 'javascript-design-pattern'
          }, {
              title:'JavaScript设计模式（行为型）之中介者模式',
              tags:['JavaScript','设计模式'],
              link:'./javascript-design-pattern/JavaScript设计模式（行为型）之中介者模式.html',
              date:'2017-05-21',
              creator: 'DuLinRain',
              category: 'javascript-design-pattern'
          }, {
              title:'JavaScript设计模式（行为型）之策略模式',
              tags:['JavaScript','设计模式'],
              link:'./javascript-design-pattern/JavaScript设计模式（行为型）之策略模式.html',
              date:'2017-05-21',
              creator: 'DuLinRain',
              category: 'javascript-design-pattern'
          }, {
              title:'JavaScript设计模式（行为型）之承诺模式',
              tags:['JavaScript','设计模式'],
              link:'./javascript-design-pattern/JavaScript设计模式（行为型）之承诺模式.html',
              date:'2017-05-21',
              creator: 'DuLinRain',
              category: 'javascript-design-pattern'
          }, {
              title:'ES6之变量和作用域',
              tags:['JavaScript','ES6'],
              link:'./es6/ES6之变量和作用域.html',
              date:'2017-05-21',
              creator: 'DuLinRain',
              category: 'es6'
          }, {
              title:'ES6之数值和数学函数',
              tags:['JavaScript','ES6'],
              link:'./es6/ES6之数值和数学函数.html',
              date:'2017-05-31',
              creator: 'DuLinRain',
              category: 'es6'
          }, {
              title:'ES6之字符串新特性',
              tags:['JavaScript','ES6'],
              link:'./es6/ES6之字符串新特性.html',
              date:'2017-07-02',
              creator: 'DuLinRain',
              category: 'es6'
          }, {
              title:'ES6之数组新特性',
              tags:['JavaScript','ES6'],
              link:'./es6/ES6之数组新特性.html',
              date:'2017-07-01',
              creator: 'DuLinRain',
              category: 'es6'
          }, {
              title:'ES6之TypedArrays',
              tags:['JavaScript','ES6'],
              link:'./es6/ES6之TypedArrays.html',
              date:'2017-07-01',
              creator: 'DuLinRain',
              category: 'es6'
          }, {
              title:'ES6之Map',
              tags:['JavaScript','ES6'],
              link:'./es6/ES6之Map.html',
              date:'2017-07-01',
              creator: 'DuLinRain',
              category: 'es6'
          }, {
              title:'ES6之Set',
              tags:['JavaScript','ES6'],
              link:'./es6/ES6之Set.html',
              date:'2017-07-02',
              creator: 'DuLinRain',
              category: 'es6'
          }, {
              title:'ES6之参数处理',
              tags:['JavaScript','ES6'],
              link:'./es6/ES6之参数处理.html',
              date:'2017-07-09',
              creator: 'DuLinRain',
              category: 'es6'
          }, {
              title:'ES6之解构',
              tags:['JavaScript','ES6'],
              link:'./es6/ES6之解构.html',
              date:'2017-07-02',
              creator: 'DuLinRain',
              category: 'es6'
          }, {
              title:'ES6之箭头函数',
              tags:['JavaScript','ES6'],
              link:'./es6/ES6之箭头函数.html',
              date:'2017-06-06',
              creator: 'DuLinRain',
              category: 'es6'
          }, {
              title:'ES6之面向对象编程（OOP）新特性',
              tags:['JavaScript','ES6'],
              link:'./es6/ES6之面向对象编程（OOP）新特性.html',
              date:'2017-07-04',
              creator: 'DuLinRain',
              category: 'es6'
          }, {
              title:'ES6之Class',
              tags:['JavaScript','ES6'],
              link:'./es6/ES6之Class.html',
              date:'2017-06-13',
              creator: 'DuLinRain',
              category: 'es6'
          }, {
              title:'ES6之异步编程基础',
              tags:['JavaScript','ES6'],
              link:'./es6/ES6之异步编程基础.html',
              date:'2017-07-08',
              creator: 'DuLinRain',
              category: 'es6'
          }, {
              title:'ECMAScript2016(ES7)',
              tags:['JavaScript','ES7'],
              link:'./es7_8/ECMAScript2016(ES7).html',
              date:'2017-07-22',
              creator: 'DuLinRain',
              category: 'es7_8'
          }, {
              title:'ECMAScript2017之参数列表尾部的逗号',
              tags:['JavaScript','ES8'],
              link:'./es7_8/ECMAScript2017之参数列表尾部的逗号.html',
              date:'2017-07-23',
              creator: 'DuLinRain',
              category: 'es7_8'
          }, {
              title:'ECMAScript2017之字符串新特性',
              tags:['JavaScript','ES8'],
              link:'./es7_8/ECMAScript2017之字符串新特性.html',
              date:'2017-07-23',
              creator: 'DuLinRain',
              category: 'es7_8'
          }, {
              title:'ECMAScript2017之对象迭代',
              tags:['JavaScript','ES8'],
              link:'./es7_8/ECMAScript2017之对象迭代.html',
              date:'2017-07-22',
              creator: 'DuLinRain',
              category: 'es7_8'
          }, {
              title:'ECMAScript2017之getOwnPropertyDescriptors',
              tags:['JavaScript','ES8'],
              link:'./es7_8/ECMAScript2017之getOwnPropertyDescriptors.html',
              date:'2017-07-22',
              creator: 'DuLinRain',
              category: 'es7_8'
          }, {
              title:'ECharts入坑之旅',
              tags:['JavaScript','绘图库'],
              link:'./drawcharts/ECharts入坑之旅.html',
              date:'2017-06-16',
              creator: 'DuLinRain',
              category: 'drawcharts'
          }, {
              title:'ElementUI之时间插件Bug',
              tags:['JavaScript','ElementUI'],
              link:'./elementui/ElementUI之时间插件Bug.html',
              date:'2017-07-02',
              creator: 'DuLinRain',
              category: 'elementui'
          }]
      };
    },
    methods: {
      handleClick(tab, event) {
        // console.log(tab, event);
        // let _ = this
        // console.log(_.test)
        // console.log(_.test1)
        // console.log(JSON.stringify(_.test))
        // Object.assign(_.test,_.test1)
        
        // console.log(JSON.stringify(_.test))
        // console.log(_.test)
        // console.log(_.test1)
        // setTimeout(function(){
        //   Object.assign(_.test,_.test1)
        //   console.log(_.test)
        //   console.log(_.test1)
        // }, 50000)
        // Object.defineProperties(_.test,Object.getOwnPropertyDescriptors(_.test1))
        
      }
    }
}
</script>

<style >
  html {
    font-family: Helvetica, sans-serif;
    background: #369;
    height: 100%;
    word-wrap: break-word;
    scroll-behavior: smooth;
  }
  body {
    background: #f2f2f2;
    background: #fff;
    width: 70%;
    /*height:100%;*/
    min-height: 500px;
    margin: 0px auto;
    padding: 20px 40px;
    color: #333;
    min-height: 100%;
  }
  ::-webkit-scrollbar {
      width: 3px;
      height: 3px;
  }

  ::-webkit-scrollbar-track-piece {
      -webkit-border-radius: 3px;
  }

  ::-webkit-scrollbar-thumb:vertical {
      height: 5px;
      -webkit-border-radius: 3px;
      background-color: #666;
  }

  ::-webkit-scrollbar-thumb:horizontal {
      width: 5px;
      -webkit-border-radius: 3px;
      background-color: #666;
  }
  svg {
    font-family: serif;
    /*font-size: 0.5in;*/
    fill: navy;
  }
  h1, h2, h3 {
    text-align: center;
  }
  .el-row {
    margin-bottom: 20px;
  }
  .el-row footer {
    border-top: 1px solid #a9a9a9;
    padding-top: 20px;
    text-align: center;
    clear: both;
  }
  .motto {
    text-align: left;
    font-size: 18px;
  }
  .signature {
    text-align: right;
    font-size: 16px;
  }
</style>
