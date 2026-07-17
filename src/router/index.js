import {createRouter,createWebHistory} from 'vue-router'
//导入组件
import Loginvue from '@/views/Login.vue'
import Layoutvue from "@/views/Layout.vue";
import ArticleCategoryVue from '@/views/article/ArticleCategory.vue'
import ArticleManageVue from '@/views/article/ArticleManage.vue'
import ArticleSquareVue from '@/views/article/ArticleSquare.vue'
import UserAvatarVue from "@/views/user/UserAvatar.vue";
import UserInfoVue from "@/views/user/UserInfo.vue";
import UserResetPasswordVue from "@/views/user/UserResetPassword.vue";
import AiChat from '@/views/ai/AiChat.vue'
import ArticleSearchResultVue from '@/views/article/ArticleSearchResult.vue'


const routes=[
    {path:'/login',component : Loginvue},
    {   path:'/',
        component : Layoutvue,
        redirect: '/article/manage',
        children: [
            {path: '/article/category', component:ArticleCategoryVue},
            {path: '/article/manage', component:ArticleManageVue},
            {path: '/article/square', component:ArticleSquareVue},
            {path: '/article/manage/search', component: ArticleSearchResultVue, meta: { source: 'manage' }},
            {path: '/article/square/search', component: ArticleSearchResultVue, meta: { source: 'square' }},
            {path: '/user/info', component:UserInfoVue},
            {path: '/user/avatar', component:UserAvatarVue},
            {path: '/user/resetPassword', component:UserResetPasswordVue},
            {path: '/ai/chat', component: AiChat}
        ]
    }
]
const router=createRouter({
    routes : routes,
    history : createWebHistory()
})

export default router;
