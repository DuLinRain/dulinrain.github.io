<template>
    <div rel="mainpage-list">
        <el-collapse v-model="activeName" accordion @change="handleAccordionChange">
          <el-collapse-item name="es6">
            <template slot="title">
              ES6
              <el-tooltip content="该系列文章介绍ES6的新增特性" placement="top" effect="light">
                <i class="header-icon el-icon-information"></i>
              </el-tooltip>
            </template>
            <ol class="archive filter-active">
              <li class="show" v-for='(article, index) in categoryArticles' :key="index">
                <a @click="handleLinkClicked(article.title)" rel="bookmark">
                  {{article.title}}
                  <span class='tags'>
                    <el-tag type="primary" v-for='tag in article.tags' :key="tag">{{tag}}</el-tag>
                  </span>
                </a>
              </li>
            </ol>
          </el-collapse-item>
          <el-collapse-item name="es7_8">
            <template slot="title">
              ECMAScript2016 & ECMAScript2017 (ES7 & ES8)
              <el-tooltip content="该系列文章介绍ES7 和 ES8的新增特性" placement="top" effect="light">
                <i class="header-icon el-icon-information"></i>
              </el-tooltip>
            </template>
            <ol class="archive filter-active">
              <li class="show" v-for='(article, index) in categoryArticles' :key="index">
                <a @click="handleLinkClicked(article.title)" rel="bookmark">
                  {{article.title}}
                  <span class='tags'>
                    <el-tag type="primary" v-for='tag in article.tags' :key="tag">{{tag}}</el-tag>
                  </span>
                </a>
              </li>
            </ol>
          </el-collapse-item>
          <el-collapse-item title="JavaScript设计模式" name="javascript-design-pattern">
            <template slot="title">
              JavaScript设计模式
              <el-tooltip content="该系列文章介绍 JavaScript设计模式 相关知识" placement="top" effect="light">
                <i class="header-icon el-icon-information"></i>
              </el-tooltip>
            </template>
            <ol class="archive filter-active">
              <li class="show" v-for='(article, index) in categoryArticles' :key="index">
                <a @click="handleLinkClicked(article.title)" rel="bookmark">
                  {{article.title}}
                  <span class='tags'>
                    <el-tag type="primary" v-for='tag in article.tags' :key="tag">{{tag}}</el-tag>
                  </span>
                </a>
              </li>
            </ol>
          </el-collapse-item>
          <el-collapse-item title="JavaScript基础知识" name="basic-javascript">
            <template slot="title">
              JavaScript基础知识
              <el-tooltip content="该系列文章介绍一些零散的JavaScript基础知识" placement="top" effect="light">
                <i class="header-icon el-icon-information"></i>
              </el-tooltip>
            </template>
            <ol class="archive filter-active">
              <li class="show" v-for='(article, index) in categoryArticles' :key="index">
                <a @click="handleLinkClicked(article.title)"  rel="bookmark">
                  {{article.title}}
                  <span class='tags'>
                    <el-tag type="primary" v-for='tag in article.tags' :key="tag">{{tag}}</el-tag>
                  </span>
                </a>
              </li>
            </ol>
          </el-collapse-item>
          <el-collapse-item title="Web安全" name="web-security">
            <template slot="title">
              Web安全
              <el-tooltip content="该系列文章介绍一些 Web安全 知识" placement="top" effect="light">
                <i class="header-icon el-icon-information"></i>
              </el-tooltip>
            </template>
            <ol class="archive filter-active">
              <li class="show" v-for='(article, index) in categoryArticles' :key="index">
                <a @click="handleLinkClicked(article.title)" rel="bookmark">
                  {{article.title}}
                  <span class='tags'>
                    <el-tag type="primary" v-for='tag in article.tags' :key="tag">{{tag}}</el-tag>
                  </span>
                </a>
              </li>
            </ol>
          </el-collapse-item>
          <el-collapse-item title="Echarts 和 Highcharts" name="drawcharts">
            <template slot="title">
              Echarts 和 Highcharts
              <el-tooltip content="该系列文章介绍一些 Echarts 和 Highcharts 相关知识" placement="top" effect="light">
                <i class="header-icon el-icon-information"></i>
              </el-tooltip>
            </template>
            <ol class="archive filter-active">
              <li class="show" v-for='(article, index) in categoryArticles' :key="index">
                <a @click="handleLinkClicked(article.title)" rel="bookmark">
                  {{article.title}}
                  <span class='tags'>
                    <el-tag type="primary" v-for='tag in article.tags' :key="tag">{{tag}}</el-tag>
                  </span>
                </a>
              </li>
            </ol>
          </el-collapse-item>
        </el-collapse>
    </div>
</template>

<script>
export default {
    name: 'mainpage-list',
    props: ['articles'],
    data () {
        return {
            activeName: 'es6',
            categoryArticles: []
        }
    },
    mounted () {
        this.handleAccordionChange(this.activeName)
    },
    methods: {
        handleAccordionChange (activeName) {
            this.categoryArticles = []
            for (let {title, link, category, tags} of this.articles) {
                if (category === activeName) {
                    this.categoryArticles.push({
                        title,
                        tags,
                        link
                    })
                } 
            }
            this.dialogVisible = true
        },
        handleLinkClicked (title) {
            window.location="https://dulinrain.github.io/"+ this.activeName +'/'+title+'.html';
        }
    }
}
</script>

<style scoped>
  div[rel="mainpage-list"] ol.archive li {
    /*margin-left: 30px;*/
    position: relative;
  }
  div[rel="mainpage-list"] ol.archive li:nth-child(odd) {
    background-color: #f5f5f5;
  }
  ol.archive li:before {
    /*content: '';*/
  }
  ol.archive a {
    display: block;
    padding: 4px 2px;
  }
  li a:hover {
    text-decoration: none;
    border: 0;
    color: #000;
    background: #e3e3e3;
  }
  .tags {
    float: right;
    margin-left: 2em;
  }
  .tags .el-tag {
    color: #333;
    word-spacing: -4px;
  }
</style>
