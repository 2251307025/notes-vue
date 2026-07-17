<script setup>
import {ref, watch, onMounted, onUnmounted} from 'vue'
import {useRouter} from 'vue-router'
import {Search} from '@element-plus/icons-vue'

const router = useRouter()

//笔记分类数据模型
const categorys = ref([])

//搜索关键词
const searchText = ref('')

//用户搜索时选中的分类id
const categoryId = ref('')

//关键词搜索（跳转搜索结果页）
const searchKeyword = ref('')

//笔记列表数据模型
const articles = ref([])

//无限滚动状态
const loading = ref(false)        // 加载中
const hasMore = ref(true)         // 是否还有更多
const lastId = ref(null)          // 游标值（最后一条笔记的id）
const isFirstLoad = ref(true)     // 是否首次加载
const sentinelRef = ref(null)     // 底部哨兵元素引用

import {articleCategoryListService, articlePublicListService} from '@/api/artcle.js'

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

//加载公共笔记列表（支持无限滚动）
const loadArticles = async () => {
  if (loading.value || !hasMore.value) return
  loading.value = true

  try {
    const params = { pageSize: 10 }

    if (isFirstLoad.value) {
      // 首次加载：使用偏移分页
      params.pageNum = 1
      params.categoryId = categoryId.value ? categoryId.value : null
      params.data = searchText.value ? searchText.value : null
    } else {
      // 滚动加载：使用游标分页
      params.lastId = lastId.value
    }

    const res = await articlePublicListService(params)

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
watch([categoryId], () => {
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

//点击卡片查看
const viewDrawerVisible = ref(false)
const viewingArticle = ref(null)
const handleCardClick = (article) => {
  viewingArticle.value = article
  viewDrawerVisible.value = true
}

// 跳转到搜索结果页
const navigateToSearch = () => {
  if (!searchKeyword.value.trim()) {
    return
  }
  router.push({
    path: '/article/square/search',
    query: { keyword: searchKeyword.value.trim() }
  })
}
</script>

<template>
  <el-card class="page-container">
    <template #header>
      <div class="header">
        <span>笔记广场</span>
        <div class="extra">
          <span class="subtitle">发现大家分享的优质笔记</span>
        </div>
      </div>
    </template>
    <!-- 搜索表单 -->
    <el-form inline class="demo-form-inline">
      <el-form-item label="笔记分类：">
        <el-select placeholder="请选择" v-model="categoryId" clearable>
          <el-option
              v-for="c in categorys"
              :key="c.id"
              :label="c.categoryName"
              :value="c.id">
          </el-option>
        </el-select>
      </el-form-item>
      <el-form-item label="关键词：">
        <el-input
            v-model="searchText"
            placeholder="请输入关键词"
            clearable
            style="width: 220px"
            @keyup.enter="resetAndLoad">
        </el-input>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="resetAndLoad">搜索</el-button>
        <el-button @click="categoryId='';searchText=''">重置</el-button>
      </el-form-item>
    </el-form>

    <!-- 关键词搜索跳转 -->
    <div class="keyword-search">
      <el-input
          v-model="searchKeyword"
          placeholder="输入关键词搜索广场笔记..."
          clearable
          style="width: 320px"
          @keyup.enter="navigateToSearch">
        <template #append>
          <el-button type="primary" @click="navigateToSearch" :icon="Search">搜索</el-button>
        </template>
      </el-input>
    </div>

    <!-- 笔记网格（3列无限滚动） -->
    <div class="article-grid">
      <div v-for="article in articles" :key="article.id" class="article-card"
           :style="{ backgroundImage: article.coverImg ? `url(${article.coverImg})` : 'none' }"
           @click="handleCardClick(article)">
        <div class="card-overlay">
          <div class="card-top">
            <span class="card-title">{{ article.title }}</span>
            <el-tag type="success" size="small" effect="dark">
              已发布
            </el-tag>
          </div>
          <div class="card-bottom">
            <span class="card-meta">{{ resolveCategoryName(article) }}</span>
            <span class="card-meta">{{ article.createTime.slice(0, 10) }}</span>
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
      <el-empty v-if="!loading && articles.length === 0" description="暂无公共笔记"/>
    </div>
  </el-card>

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
          <el-tag type="success" size="small">
            已发布
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

    .subtitle {
      font-size: 13px;
      color: var(--el-text-color-secondary);
    }
  }
}

.demo-form-inline .el-select {
  --el-select-width: 220px;
}

.keyword-search {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed var(--el-border-color-lighter);
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
</style>
