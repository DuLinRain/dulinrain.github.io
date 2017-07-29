<template>
    <div rel="mainpage-table">
        <el-table :data="articles" stripe :default-sort = "{prop: 'index', order: 'ascending'}">
          <el-table-column property="index" label="" width="60" sortable fixed></el-table-column>
          <el-table-column property="title" label="标题" width="450" sortable fixed></el-table-column>
          <el-table-column property="tags" label="标签" sortable width="200">
            <template scope="scope">
              <el-tag type="primary">{{ scope.row.tags.join(', ') }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column property="creator" label="作者" sortable width="200"></el-table-column>
          <el-table-column property="date" label="日期" sortable width="200">
            <template scope="scope">
              <el-icon name="time"></el-icon>
              <span style="margin-left: 10px">{{ scope.row.date }}</span>
            </template>
          </el-table-column>
          <el-table-column property="category" label="类目" sortable width="200"></el-table-column>
          <el-table-column label="操作" fixed="right" width="100">
            <template scope="scope">
              <el-button
                size="small"
                @click="handleStartRead(scope.$index, scope.row)">开始阅读</el-button>
            </template>
          </el-table-column>
        </el-table>
    </div>
</template>

<script>
export default {
    name: 'mainpage-table',
    props: ['articles'],
    mounted () {
        // console.log(this.articles)
    },
    methods: {
        handleStartRead (index, row) {
            window.location="https://dulinrain.github.io/"+ row.category +'/'+row.title+'.html';
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
</style>
