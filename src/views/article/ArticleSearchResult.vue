<script setup>
import {ref, onMounted} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import {
  Edit,
  Delete,
  Plus,
  Back,
  Search
} from '@element-plus/icons-vue'
import {QuillEditor} from '@vueup/vue-quill'
import '@vueup/vue-quill/dist/vue-quill.snow.css'
import {ElMessage, ElMessageBox} from 'element-plus'
import {useTokenStore} from '@/stores/token.js'
import {
  articleAddService,
  articleCategoryListService,
  articleDeleteService,
  articleListService,
  articlePublicListService,
  articleUpdateService
} from '@/api/artcle.js'
import {generateImage} from '@/api/chat.js'

const route = useRoute()
const router = useRouter()
const tokenStore = useTokenStore()

// 来源：manage 或 square
const source = route.meta.source

// 搜索关键词
const keyword = ref(route.query.keyword || '')

// 分页数据
const articles = ref([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = 5
const maxPages = 10
const loading = ref(false)

// 分类
const categorys = ref([])
const articleCategoryList = async () => {
  let result = await articleCategoryListService()
  categorys.value = result.data
}
articleCategoryList()

// 解析分类名称
const resolveCategoryName = (article) => {
  for (let j = 0; j < categorys.value.length; j++) {
    if (article.categoryId === categorys.value[j].id) {
      return categorys.value[j].categoryName
    }
  }
  return ''
}

// 去除HTML标签
const stripHtml = (html) => {
  if (!html) return ''
  return html.replace(/<[^>]+>/g, '').trim()
}

// 加载搜索结果
const fetchArticles = async () => {
  if (!keyword.value || !keyword.value.trim()) return
  loading.value = true
  try {
    const params = {
      pageNum: currentPage.value,
      pageSize: pageSize,
      data: keyword.value.trim()
    }
    const res = source === 'manage'
      ? await articleListService(params)
      : await articlePublicListService(params)
    articles.value = res.data.items || []
    total.value = res.data.total || 0
  } finally {
    loading.value = false
  }
}

// 翻页
const handlePageChange = (page) => {
  currentPage.value = page
  fetchArticles()
}

// 搜索（重新搜索）
const handleSearch = () => {
  if (!keyword.value.trim()) {
    ElMessage.warning('请输入搜索关键词')
    return
  }
  currentPage.value = 1
  router.replace({query: {keyword: keyword.value.trim()}})
  fetchArticles()
}

// 返回来源页
const handleBack = () => {
  const backPath = source === 'manage' ? '/article/manage' : '/article/square'
  router.push(backPath)
}

// ========== 以下仅 manage 模式使用 ==========

// 抽屉控制
const visibleDrawer = ref(false)
const viewDrawerVisible = ref(false)
const viewingArticle = ref(null)
const title = ref('')

// 表单模型
const articleModel = ref({
  title: '',
  categoryId: '',
  coverImg: '',
  content: '',
  state: ''
})

// 上传成功
const uploadSuccess = (result) => {
  articleModel.value.coverImg = result.data
}

// 清空表单
const clearArticleModel = () => {
  articleModel.value.content = ''
  articleModel.value.state = ''
  articleModel.value.coverImg = ''
  articleModel.value.title = ''
  articleModel.value.categoryId = ''
  articleModel.value.id = ''
}

// 打开添加抽屉
const openAddDrawer = () => {
  title.value = '添加笔记'
  clearArticleModel()
  visibleDrawer.value = true
}

// 打开编辑抽屉
const openEditDrawer = (article) => {
  title.value = '编辑笔记'
  articleModel.value.title = article.title
  articleModel.value.coverImg = article.coverImg
  articleModel.value.categoryId = article.categoryId
  articleModel.value.content = article.content
  articleModel.value.id = article.id
  articleModel.value.state = article.state
  visibleDrawer.value = true
}

// 添加笔记
const addArticle = async (clickState) => {
  articleModel.value.state = clickState
  let result = await articleAddService(articleModel.value)
  ElMessage.success(result.msg ? result.msg : '添加成功')
  visibleDrawer.value = false
  currentPage.value = 1
  await fetchArticles()
}

// 更新笔记
const updateArticle = async (clickState) => {
  articleModel.value.state = clickState
  let result = await articleUpdateService(articleModel.value)
  ElMessage.success(result.msg ? result.msg : '修改成功')
  visibleDrawer.value = false
  await fetchArticles()
}

// 删除笔记
const deleteArticle = (article) => {
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
        await articleDeleteService(article.id)
        ElMessage.success('删除成功')
        // 如果当前页只有一条且不是第一页，回退一页
        if (articles.value.length === 1 && currentPage.value > 1) {
          currentPage.value--
        }
        await fetchArticles()
      })
      .catch(() => {
        ElMessage.info('取消删除')
      })
}

// AI生成封面
const generatingImage = ref(false)
const handleGenerateImage = async () => {
  const content = articleModel.value.content
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

// 点击查看详情
const handleCardClick = (article) => {
  viewingArticle.value = article
  viewDrawerVisible.value = true
}

onMounted(() => {
  if (keyword.value) {
    fetchArticles()
  }
})
</script>

<template>
  <el-card class="page-container">
    <template #header>
      <div class="header">
        <div class="header-left">
          <el-button @click="handleBack" :icon="Back">返回</el-button>
          <span class="page-title">
            {{ source === 'manage' ? '笔记管理' : '笔记广场' }} - 搜索结果
          </span>
        </div>
        <div class="extra" v-if="source === 'manage'">
          <el-button type="primary" @click="openAddDrawer">添加笔记</el-button>
        </div>
      </div>
    </template>

    <!-- 搜索栏 -->
    <div class="search-bar">
      <el-input
          v-model="keyword"
          placeholder="请输入搜索关键词"
          clearable
          style="width: 360px"
          @keyup.enter="handleSearch">
        <template #append>
          <el-button type="primary" @click="handleSearch" :icon="Search">搜索</el-button>
        </template>
      </el-input>
      <span class="result-info" v-if="total > 0">
        搜索 "<strong>{{ keyword }}</strong>" 找到 {{ total }} 条结果
      </span>
    </div>

    <!-- 搜索结果列表 -->
    <div class="result-list" v-loading="loading">
      <div v-for="article in articles" :key="article.id" class="result-item">
        <div class="result-cover" @click="handleCardClick(article)">
          <img :src="article.coverImg || '/default-cover.png'" alt="封面"/>
        </div>
        <div class="result-info">
          <h3 class="result-title" @click="handleCardClick(article)">{{ article.title }}</h3>
          <div class="result-meta">
            <el-tag size="small" v-if="source === 'manage'"
                    :type="article.state === '已发布' ? 'success' : 'info'">
              {{ article.state }}
            </el-tag>
            <el-tag size="small" type="success" v-else>已发布</el-tag>
            <span class="meta-category">{{ resolveCategoryName(article) }}</span>
            <span class="meta-time">{{ article.createTime?.slice(0, 10) }}</span>
          </div>
          <p class="result-summary">{{ stripHtml(article.content).slice(0, 120) }}...</p>
          <div class="result-actions" v-if="source === 'manage'">
            <el-button size="small" type="primary" @click="openEditDrawer(article)">编辑</el-button>
            <el-button size="small" type="danger" @click="deleteArticle(article)">删除</el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <el-empty v-if="!loading && articles.length === 0" description="没有找到相关笔记"/>

    <!-- 分页 -->
    <div class="pagination-wrapper" v-if="total > 0">
      <el-pagination
          v-model:current-page="currentPage"
          :page-size="pageSize"
          :total="Math.min(total, maxPages * pageSize)"
          layout="prev, pager, next, jumper"
          @current-change="handlePageChange"
      />
    </div>
  </el-card>

  <!-- 添加/编辑抽屉（仅 manage 模式） -->
  <el-drawer v-if="source === 'manage'" v-model="visibleDrawer" :title="title" direction="rtl" size="50%">
    <el-form :model="articleModel" label-width="100px">
      <el-form-item label="笔记标题">
        <el-input v-model="articleModel.title" placeholder="请输入标题"></el-input>
      </el-form-item>
      <el-form-item label="笔记分类">
        <el-select placeholder="请选择" v-model="articleModel.categoryId">
          <el-option v-for="c in categorys" :key="c.id" :label="c.categoryName" :value="c.id"></el-option>
        </el-select>
      </el-form-item>
      <el-form-item label="笔记封面">
        <div class="cover-actions">
          <el-upload class="avatar-uploader" :auto-upload="true" :show-file-list="false"
                     action="/api/upload"
                     name="file"
                     :headers="{'Authorization': tokenStore.token}"
                     :on-success="uploadSuccess">
            <img v-if="articleModel.coverImg" :src="articleModel.coverImg" class="avatar"/>
            <el-icon v-else class="avatar-uploader-icon">
              <Plus/>
            </el-icon>
          </el-upload>
          <el-button type="primary" :loading="generatingImage" @click="handleGenerateImage"
                     style="margin-left: 12px;">
            AI生成封面
          </el-button>
        </div>
      </el-form-item>
      <el-form-item label="笔记内容">
        <div class="editor">
          <quill-editor v-if="visibleDrawer"
                        theme="snow"
                        v-model:content="articleModel.content"
                        contentType="html">
          </quill-editor>
        </div>
      </el-form-item>
      <el-form-item>
        <el-button type="primary"
                   @click="title==='添加笔记' ? addArticle('已发布') : updateArticle('已发布')">发布
        </el-button>
        <el-button type="info"
                   @click="title==='添加笔记' ? addArticle('草稿') : updateArticle('草稿')">草稿
        </el-button>
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
        <div class="info-row" v-if="source === 'manage'">
          <span class="info-label">状态</span>
          <el-tag :type="viewingArticle.state === '已发布' ? 'success' : 'info'" size="small">
            {{ viewingArticle.state }}
          </el-tag>
        </div>
        <div class="info-row">
          <span class="info-label">发表时间</span>
          <span>{{ viewingArticle.createTime?.slice(0, 10) }}</span>
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

    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .page-title {
      font-size: 16px;
      font-weight: 600;
      color: var(--el-text-color-primary);
    }
  }
}

.search-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;

  .result-info {
    font-size: 14px;
    color: var(--el-text-color-secondary);

    strong {
      color: var(--el-color-primary);
    }
  }
}

.result-list {
  min-height: 200px;
}

.result-item {
  display: flex;
  gap: 16px;
  padding: 16px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
  transition: background 0.2s ease;

  &:hover {
    background: var(--el-fill-color-light);
    border-radius: 8px;
    padding-left: 8px;
    padding-right: 8px;
  }

  .result-cover {
    flex-shrink: 0;
    width: 160px;
    height: 100px;
    border-radius: 6px;
    overflow: hidden;
    cursor: pointer;
    background: var(--el-fill-color);

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  .result-info {
    flex: 1;
    min-width: 0;
  }

  .result-title {
    font-size: 16px;
    font-weight: 600;
    margin: 0 0 8px;
    cursor: pointer;
    color: var(--el-text-color-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;

    &:hover {
      color: var(--el-color-primary);
    }
  }

  .result-meta {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 8px;
    font-size: 13px;
    color: var(--el-text-color-secondary);

    .meta-category {
      color: var(--el-text-color-regular);
    }
  }

  .result-summary {
    font-size: 13px;
    color: var(--el-text-color-regular);
    line-height: 1.6;
    margin: 0 0 8px;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  .result-actions {
    display: flex;
    gap: 8px;
  }
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 32px;
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
