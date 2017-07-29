<template>
    <div rel="mainpage-carousel">
        <el-carousel :interval="4000" type="card" height="350px">
            <el-carousel-item>
              <img src="../img/es6.jpg" width="100%" height="100%" @click.stop="handleCarouselDetail('es6')"/>
            </el-carousel-item>
            <el-carousel-item>
              <img src="../img/es7_8.jpg" width="100%" height="100%" @click.stop="handleCarouselDetail('es7_8')"/>
            </el-carousel-item>
            <el-carousel-item>
              <img src="../img/vuejs.jpg" width="100%" height="100%" @click.stop="handleCarouselDetail('vuejs')"/>
            </el-carousel-item>
            <el-carousel-item>
              <img src="../img/svg.jpg" width="100%" height="100%" @click.stop="handleCarouselDetail('svg')"/>
            </el-carousel-item>
            <el-carousel-item>
              <img src="../img/basic_javascript.jpg" width="100%" height="100%" @click.stop="handleCarouselDetail('basic-javascript')"/>
            </el-carousel-item>
            <el-carousel-item>
              <img src="../img/javascript_design_pattern.jpg" width="100%" height="100%" @click.stop="handleCarouselDetail('javascript-design-pattern')"/>
            </el-carousel-item>
            <el-carousel-item>
              <img src="../img/web_security.jpg" width="100%" height="100%" @click.stop="handleCarouselDetail('web-security')"/>
            </el-carousel-item>
            <el-carousel-item>
              <img src="../img/canvas.jpg" width="100%" height="100%" @click.stop="handleCarouselDetail('canvas')"/>
            </el-carousel-item>
            <el-carousel-item>
              <img src="../img/drawcharts.jpg" width="100%" height="100%" @click.stop="handleCarouselDetail('drawcharts')"/>
            </el-carousel-item>
            <el-carousel-item>
              <img src="../img/element_ui.jpg" width="100%" height="100%" @click.stop="handleCarouselDetail('elementui')"/>
            </el-carousel-item>
        </el-carousel>
        <el-dialog :title="currentCategory + '文章列表'" size="large" :visible.sync="dialogVisible">
          <el-table :data="categoryArticles" stripe :default-sort = "{prop: 'date', order: 'descending'}">
            <el-table-column property="title" label="标题" sortable></el-table-column>
            <el-table-column property="tags" label="标签" width="200">
              <template scope="scope">
                <el-tag type="primary">{{ scope.row.tags.join(', ') }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column property="creator" sortable label="作者" width="200"></el-table-column>
            <el-table-column property="date" sortable label="日期" width="200">
            <template scope="scope">
              <el-icon name="time"></el-icon>
              <span style="margin-left: 10px">{{ scope.row.date }}</span>
            </template>
            </el-table-column>
            <el-table-column label="操作" width="100">
              <template scope="scope">
                <el-button
                  size="small"
                  @click="handleStartRead(scope.$index, scope.row)">开始阅读</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-dialog>
    </div>
</template>

<script>
export default {
    name: 'mainpage-carousel',
    data () {
        return {
            categoryArticles: [],
            dialogVisible: false,
            currentCategory: ''
        }
    },
    props: ['articles'],
    mounted () {
        // console.log(this.articles)
    },
    methods: {
        handleCarouselDetail (selected_category) {
            this.categoryArticles = []
            this.currentCategory = selected_category
            for (let {title, creator, date, category, tags} of this.articles) {
                if (category === selected_category) {
                    this.categoryArticles.push({
                        title,
                        creator,
                        date,
                        tags
                    })
                } 
            }
            this.dialogVisible = true
        },
        handleStartRead (index, row) {
            window.location="https://dulinrain.github.io/"+ this.currentCategory +'/'+row.title+'.html';
        }
    }
}
</script>

<style scoped>
  .el-carousel__item h3 {
    color: #475669;
    font-size: 14px;
    opacity: 0.75;
    line-height: 200px;
    margin: 0;
  }
  
  .el-carousel__item:nth-child(2n) {
    background-color: #99a9bf;
  }
  
  .el-carousel__item:nth-child(2n+1) {
    background-color: #d3dce6;
  }
  .el-carousel-item {
    padding: 20px 40px;
  }
</style>
