<script setup>
import {
  Edit,
  Delete
} from '@element-plus/icons-vue'

import {ref, watch, onMounted, onUnmounted} from 'vue'

//笔记分类数据模型
const categorys = ref([])

//用户搜索时选中的分类id
const categoryId = ref('')

//用户搜索时选中的发布状态
const state = ref('')

//笔记列表数据模型
const articles = ref([])

//无限滚动状态
const loading = ref(false)        // 加载中
const hasMore = ref(true)         // 是否还有更多
const lastId = ref(null)          // 游标值（最后一条笔记的id）
const isFirstLoad = ref(true)     // 是否首次加载
const sentinelRef = ref(null)     // 底部哨兵元素引用

import {useTokenStore} from "@/stores/token.js";
const tokenStore=useTokenStore();
import {QuillEditor} from '@vueup/vue-quill'
import '@vueup/vue-quill/dist/vue-quill.snow.css'
import {
  articleAddService,
  articleCategoryListService,
  articleDeleteService,
  articleListService, articleUpdateService
} from '@/api/artcle.js'
import { generateImage } from '@/api/chat.js'
//回显笔记分类
const articleCategoryList = async () => {
  let result = await articleCategoryListService()
  categorys.value = result.data
}
articleCategoryList()

//解析笔记分类名称
const resolveCategoryName = (article) => {
  for (let j = 0; j < categorys.value.length; j++) {
    if (article.categoryId === categorys.value[j].id) {
      return categorys.value[j].categoryName
    }
  }
  return ''
}

//加载笔记列表（支持无限滚动）
const loadArticles = async () => {
  if (loading.value || !hasMore.value) return
  loading.value = true

  try {
    const params = { pageSize: 10 }

    if (isFirstLoad.value) {
      // 首次加载：使用偏移分页，拿到 total
      params.pageNum = 1
      params.categoryId = categoryId.value ? categoryId.value : null
      params.state = state.value ? state.value : null
    } else {
      // 滚动加载：使用游标分页
      params.lastId = lastId.value
    }

    const res = await articleListService(params)

    if (isFirstLoad.value) {
      // 首次加载：替换列表
      articles.value = res.data.items
      isFirstLoad.value = false
      // 根据 total 判断是否还有更多
      hasMore.value = articles.value.length < res.data.total
    } else {
      // 追加到现有列表
      articles.value = [...articles.value, ...res.data.items]
      // 游标分页优先使用 hasMore 字段
      if (res.data.hasMore !== null && res.data.hasMore !== undefined) {
        hasMore.value = res.data.hasMore
      }
    }

    // 更新游标：取最后一条的 id
    const items = res.data.items
    if (items.length > 0) {
      lastId.value = items[items.length - 1].id
    }
  } finally {
    loading.value = false
  }
}

//重置并重新加载（筛选条件变化时调用）
const resetAndLoad = () => {
  articles.value = []
  lastId.value = null
  hasMore.value = true
  isFirstLoad.value = true
  loadArticles()
}

//监听筛选条件变化
watch([categoryId, state], () => {
  resetAndLoad()
})

//IntersectionObserver 监听底部哨兵元素实现无限滚动
let scrollObserver = null
onMounted(() => {
  loadArticles()
  scrollObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          loadArticles()
        }
      },
      { rootMargin: '100px' }
  )
  if (sentinelRef.value) {
    scrollObserver.observe(sentinelRef.value)
  }
})

onUnmounted(() => {
  if (scrollObserver) {
    scrollObserver.disconnect()
    scrollObserver = null
  }
})

import {Plus} from '@element-plus/icons-vue'
//控制抽屉是否显示
const visibleDrawer = ref(false)
//查看抽屉
const viewDrawerVisible = ref(false)
const viewingArticle = ref(null)
//添加表单数据模型
const title =ref('')
const articleModel = ref({
  title: '',
  categoryId: '',
  coverImg: '',
  content: '',
  state: ''
})
//上传成功
const uploadSuccess=(result)=>{
  articleModel.value.coverImg=result.data;
  console.log(result.data)
}
//添加
import {ElMessage, ElMessageBox} from "element-plus";

const clearArticleModel=()=>{
  articleModel.value.content=''
  articleModel.value.state=''
  articleModel.value.coverImg=''
  articleModel.value.title=''
  articleModel.value.categoryId=''
}
const  addArticle=async (clickState) => {

  articleModel.value.state = clickState;
  let result = await articleAddService(articleModel.value)
 ElMessage.success(result.msg? result.msg:'添加成功')
  visibleDrawer.value=false
   await resetAndLoad()
}

// 生成封面图片
const generatingImage = ref(false)
const handleGenerateImage = async () => {
  const content = articleModel.value.content
  // 去除HTML标签后判断长度
  const plainText = content.replace(/<[^>]+>/g, '').trim()
  if (plainText.length < 5) {
    ElMessage.warning('笔记内容至少需要5个文字才能生成封面')
    return
  }
  generatingImage.value = true
  try {
    const imageUrl = await generateImage(plainText)
    articleModel.value.coverImg = imageUrl.data || imageUrl
    ElMessage.success('封面生成成功')
  } catch (e) {
    ElMessage.error('封面生成失败')
  } finally {
    generatingImage.value = false
  }
}
//删除笔记
const deleteArticle =(row)=>{
  ElMessageBox.confirm(
      '确定删除?',
      '提示',
      {
        confirmButtonText: '确认',
        cancelButtonText: '取消',
        type: 'warning',
      }
  )
      .then(async () => {
        let result = await articleDeleteService(row.id);
        ElMessage({
          type: 'success',
          message: '删除成功',
        })
        await resetAndLoad();
      })
      .catch(() => {
        ElMessage({
          type: 'info',
          message: '取消删除',
        })
      })
}
const updateArticle=async (clickState) => {
  articleModel.value.state = clickState;
  let result = await articleUpdateService(articleModel.value)
  ElMessage.success(result.msg ? result.msg : '修改成功')
  await resetAndLoad()
  visibleDrawer.value=false;
}
//笔记数据回调
const showArticle=(row)=>{
  articleModel.value.title=row.title;
  articleModel.value.coverImg=row.coverImg;
  articleModel.value.categoryId=row.categoryId;
  articleModel.value.content=row.content
  articleModel.value.id=row.id;
}
//点击卡片查看
const handleCardClick = (article) => {
  viewingArticle.value = article
  viewDrawerVisible.value = true
}
</script>
<template>
  <el-card class="page-container">
    <template #header>
      <div class="header">
        <span>笔记管理</span>
        <div class="extra">
          <el-button type="primary" @click="visibleDrawer=true;title='添加笔记';clearArticleModel()">添加笔记</el-button>
        </div>
      </div>
    </template>
    <!-- 搜索表单 -->
    <el-form inline class="demo-form-inline">
      <el-form-item label="笔记分类：">
        <el-select placeholder="请选择" v-model="categoryId">
          <el-option
              v-for="c in categorys"
              :key="c.id"
              :label="c.categoryName"
              :value="c.id">
          </el-option>
        </el-select>
      </el-form-item>

      <el-form-item label="发布状态：">
        <el-select placeholder="请选择" v-model="state">
          <el-option label="已发布" value="已发布"></el-option>
          <el-option label="草稿" value="草稿"></el-option>
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="resetAndLoad">搜索</el-button>
        <el-button @click="categoryId='';state=''">重置</el-button>
      </el-form-item>
    </el-form>

    <!-- 笔记网格（3列无限滚动） -->
    <div class="article-grid">
      <div v-for="article in articles" :key="article.id" class="article-card"
           :style="{ backgroundImage: article.coverImg ? `url(${article.coverImg})` : 'none' }"
           @click="handleCardClick(article)">
        <div class="card-overlay">
          <div class="card-top">
            <span class="card-title">{{ article.title }}</span>
            <el-tag :type="article.state === '已发布' ? 'success' : 'info'" size="small" effect="dark">
              {{ article.state }}
            </el-tag>
          </div>
          <div class="card-bottom">
            <span class="card-meta">{{ resolveCategoryName(article) }}</span>
            <span class="card-meta">{{ article.createTime.slice(0, 10) }}</span>
            <div class="card-actions">
              <el-button :icon="Edit" circle plain type="primary" size="small"
                         @click.stop="visibleDrawer=true;title='编辑笔记';showArticle(article)"></el-button>
              <el-button :icon="Delete" circle plain type="danger" size="small"
                         @click.stop="deleteArticle(article)"></el-button>
            </div>
          </div>
        </div>
      </div>

      <!-- 加载中 -->
      <div v-if="loading" class="load-status">
        <el-icon class="is-loading" style="margin-right: 6px">
          <svg viewBox="0 0 1024 1024" width="16" height="16">
            <path d="M512 64a32 32 0 0 1 32 32v192a32 32 0 0 1-64 0V96a32 32 0 0 1 32-32z" fill="currentColor"/>
            <path d="M512 736a32 32 0 0 1 32 32v192a32 32 0 0 1-64 0V768a32 32 0 0 1 32-32z" fill="currentColor" opacity="0.6"/>
            <path d="M832 448a32 32 0 0 1 32 32v64a32 32 0 0 1-64 0v-64a32 32 0 0 1 32-32z" fill="currentColor" opacity="0.2"/>
            <path d="M192 448a32 32 0 0 1 32 32v64a32 32 0 0 1-64 0v-64a32 32 0 0 1 32-32z" fill="currentColor" opacity="0.8"/>
            <path d="M739.2 260.8a32 32 0 0 1 45.28 0l135.76 135.76a32 32 0 0 1-45.28 45.28L739.2 306.08a32 32 0 0 1 0-45.28z" fill="currentColor" opacity="0.4"/>
            <path d="M103.76 582.16a32 32 0 0 1 45.28 0l135.76 135.76a32 32 0 0 1-45.28 45.28L103.76 627.44a32 32 0 0 1 0-45.28z" fill="currentColor" opacity="0.7"/>
            <path d="M739.2 763.2a32 32 0 0 1 0 45.28L603.44 944.24a32 32 0 0 1-45.28-45.28l135.76-135.76a32 32 0 0 1 45.28 0z" fill="currentColor" opacity="0.3"/>
            <path d="M284.8 260.8a32 32 0 0 1 0 45.28L149.04 441.84a32 32 0 0 1-45.28-45.28L239.52 260.8a32 32 0 0 1 45.28 0z" fill="currentColor" opacity="0.9"/>
          </svg>
        </el-icon>
        加载中...
      </div>

      <!-- 没有更多了 -->
      <div v-if="!hasMore && articles.length > 0" class="load-status no-more">
        — 没有更多了 —
      </div>

      <!-- 哨兵元素 -->
      <div ref="sentinelRef" style="height: 1px"></div>

      <!-- 空状态 -->
      <el-empty v-if="!loading && articles.length === 0" description="暂无笔记"/>
    </div>
  </el-card>
  <el-drawer v-model="visibleDrawer" :title=title  direction="rtl" size="50%">
    <!-- 添加笔记表单 -->
    <el-form :model="articleModel" label-width="100px">
      <el-form-item label="笔记标题">
        <el-input v-model="articleModel.title" placeholder="请输入标题"></el-input>
      </el-form-item>
      <el-form-item label="笔记分类">
        <el-select placeholder="请选择" v-model="articleModel.categoryId">
          <el-option v-for="c in categorys" :key="c.id" :label="c.categoryName" :value="c.id">
          </el-option>
        </el-select>
      </el-form-item>
      <el-form-item label="笔记封面">
        <div class="cover-actions">
          <el-upload class="avatar-uploader" :auto-upload="true" :show-file-list="false"
                     action="/api/upload"
                     name="file"
                     :headers="{'Authorization':tokenStore.token}"
                     :on-success="uploadSuccess"
          >
            <img v-if="articleModel.coverImg" :src="articleModel.coverImg" class="avatar"/>
            <el-icon v-else class="avatar-uploader-icon">
              <Plus/>
            </el-icon>
          </el-upload>
          <el-button type="primary" :loading="generatingImage" @click="handleGenerateImage" style="margin-left: 12px;">
            AI生成封面
          </el-button>
        </div>
      </el-form-item>
      <el-form-item label="笔记内容">
        <div class="editor">
          <quill-editor v-if="visibleDrawer"
              theme="snow"
              v-model:content="articleModel.content"
              contentType="html"
          >
          </quill-editor>
        </div>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="title==='添加笔记'? addArticle('已发布'):updateArticle('已发布')">发布</el-button>
        <el-button type="info" @click="title==='添加笔记'? addArticle('草稿'):updateArticle('草稿')">草稿</el-button>
      </el-form-item>
    </el-form>
  </el-drawer>
  <!-- 查看笔记抽屉 -->
  <el-drawer v-model="viewDrawerVisible" :title="viewingArticle?.title || '查看笔记'" direction="rtl" size="50%">
    <div v-if="viewingArticle" class="view-article">
      <div class="view-cover" v-if="viewingArticle.coverImg">
        <img :src="viewingArticle.coverImg" alt="封面"/>
      </div>
      <div class="view-info">
        <div class="info-row">
          <span class="info-label">分类</span>
          <span>{{ resolveCategoryName(viewingArticle) }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">状态</span>
          <el-tag :type="viewingArticle.state === '已发布' ? 'success' : 'info'" size="small">
            {{ viewingArticle.state }}
          </el-tag>
        </div>
        <div class="info-row">
          <span class="info-label">发表时间</span>
          <span>{{ viewingArticle.createTime.slice(0, 10) }}</span>
        </div>
      </div>
      <div class="view-content" v-html="viewingArticle.content"></div>
    </div>
  </el-drawer>
</template>
<style lang="scss" scoped>
.page-container {
  min-height: 100%;
  box-sizing: border-box;

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
}

.demo-form-inline .el-select {
  --el-select-width: 220px;
}

.article-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-top: 20px;
}

.article-card {
  position: relative;
  border-radius: 10px;
  overflow: hidden;
  aspect-ratio: 3 / 4;
  background-size: cover;
  background-position: center;
  background-color: var(--el-color-info-light-5);
  cursor: pointer;
  transition: transform 0.25s ease, box-shadow 0.25s ease;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);

    .card-overlay {
      background: linear-gradient(transparent 30%, rgba(0, 0, 0, 0.85));
    }
  }

  .card-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 14px;
    background: linear-gradient(transparent 40%, rgba(0, 0, 0, 0.75));
    transition: background 0.25s ease;
  }

  .card-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;

    .card-title {
      font-size: 15px;
      font-weight: 600;
      color: #fff;
      line-height: 1.4;
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      flex: 1;
    }
  }

  .card-bottom {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;

    .card-meta {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.8);
    }

    .card-actions {
      margin-left: auto;
      display: flex;
      gap: 6px;
    }
  }
}

.load-status {
  grid-column: 1 / -1;
  text-align: center;
  padding: 24px 0;
  color: var(--el-text-color-secondary);
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;

  &.no-more {
    color: var(--el-text-color-placeholder);
  }
}

.article-grid .el-empty {
  grid-column: 1 / -1;
}

.view-article {
  padding: 0 8px;

  .view-cover {
    max-width: 300px;
    margin-bottom: 20px;
    border-radius: 8px;
    overflow: hidden;

    img {
      width: 100%;
      display: block;
    }
  }

  .view-info {
    background: var(--el-fill-color-light);
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 20px;

    .info-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 6px 0;
      font-size: 14px;

      .info-label {
        color: var(--el-text-color-secondary);
        min-width: 60px;
        flex-shrink: 0;
      }
    }
  }

  .view-content {
    font-size: 15px;
    line-height: 1.8;
    color: var(--el-text-color-primary);
  }
}

.avatar-uploader {
  :deep() {
    .avatar {
      width: 178px;
      height: 178px;
    }

    .el-upload {
      border: 1px dashed var(--el-border-color);
      border-radius: 6px;
      cursor: pointer;
      position: relative;
      overflow: hidden;
      transition: var(--el-transition-duration-fast);
    }

    .el-upload:hover {
      border-color: var(--el-color-primary);
    }

    .el-icon.avatar-uploader-icon {
      font-size: 28px;
      color: #8c939d;
      width: 178px;
      height: 178px;
      text-align: center;
    }
  }
}

.cover-actions {
  display: flex;
  align-items: flex-end;
}

.editor {
  width: 100%;

  :deep(.ql-editor) {
    min-height: 200px;
  }
}
</style>
