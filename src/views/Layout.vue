<script setup>
import {
  Management,
  Promotion,
  ChatLineRound,
  UserFilled,
  User,
  Crop,
  EditPen,
  SwitchButton,
  CaretBottom
} from '@element-plus/icons-vue'
import avatar from '@/assets/default.png'
import {userInfoService} from "@/api/user.js";
import {useUserInfoStore} from "@/stores/userInfo.js"
const userInfoStore=useUserInfoStore()
const getUserInfo=async ()=>{
  let result= await userInfoService()
  userInfoStore.setInfo(result.data)
}
getUserInfo();
import {useRouter} from "vue-router";
import {ElMessage, ElMessageBox} from "element-plus";
const router=useRouter();
import {useTokenStore} from "@/stores/token.js";
const tokenStore=useTokenStore();
const handleCommand =(command)=>{
    if(command==='logout'){
      ElMessageBox.confirm(
          '确认退出?',
          '提示',
          {
            confirmButtonText: '确认',
            cancelButtonText: '取消',
            type: 'warning',
          }
      )
          .then(async () => {
            tokenStore.removeToken();
            userInfoStore.removeInfo()
            router.push('/login')
            ElMessage({
              type: 'success',
              message: '退出成功',
            })
          })
          .catch(() => {
            ElMessage({
              type: 'info',
              message: '取消退出',
            })
          })
    }else {
      router.push('/user/'+command)
    }
}
</script>

<template>
  <el-container class="layout-container">
    <!-- 左侧菜单 -->
    <el-aside width="200px">
      <div class="el-aside__logo"></div>
      <!-- 动漫装饰星星 -->
      <div class="anime-stars">
        <span class="star star-1">✦</span>
        <span class="star star-2">✧</span>
        <span class="star star-3">✦</span>
        <span class="star star-4">✧</span>
        <span class="star star-5">✦</span>
        <span class="star star-6">✧</span>
        <span class="star star-7">✦</span>
        <span class="star star-8">✧</span>
      </div>
      <el-menu
          active-text-color="#fff"
          background-color="transparent"
          text-color="rgba(255,255,255,0.72)"
          router
      >
        <el-menu-item index="/article/category">
          <el-icon><Management/></el-icon>
          <span>笔记分类</span>
        </el-menu-item>
        <el-menu-item index="/article/manage">
          <el-icon><Promotion/></el-icon>
          <span>笔记管理</span>
        </el-menu-item>
        <el-menu-item index="/ai/chat">
          <el-icon><ChatLineRound/></el-icon>
          <span>AI 助手</span>
        </el-menu-item>
        <el-sub-menu>
          <template #title>
            <el-icon><UserFilled/></el-icon>
            <span>个人中心</span>
          </template>
          <el-menu-item index="/user/info">
            <el-icon><User/></el-icon>
            <span>基本资料</span>
          </el-menu-item>
          <el-menu-item index="/user/avatar">
            <el-icon><Crop/></el-icon>
            <span>更换头像</span>
          </el-menu-item>
          <el-menu-item index="/user/resetPassword">
            <el-icon><EditPen/></el-icon>
            <span>重置密码</span>
          </el-menu-item>
        </el-sub-menu>
      </el-menu>
    </el-aside>
    <!-- 右侧主区域 -->
    <el-container>
      <!-- 头部区域 -->
      <el-header>
        <div class="header-left">
          <span class="header-welcome">✦ 欢迎回来</span>
          <span class="header-divider"></span>
          <span class="header-user">用户: <strong>{{userInfoStore.info.nickname}}</strong></span>
        </div>
        <el-dropdown placement="bottom-end" @command="handleCommand">
          <span class="el-dropdown__box">
            <el-avatar :src="userInfoStore.info.userPic?userInfoStore.info.userPic:avatar"/>
            <el-icon><CaretBottom/></el-icon>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="info" :icon="User">基本资料</el-dropdown-item>
              <el-dropdown-item command="avatar" :icon="Crop">更换头像</el-dropdown-item>
              <el-dropdown-item command="resetPassword" :icon="EditPen">重置密码</el-dropdown-item>
              <el-dropdown-item command="logout" :icon="SwitchButton">退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </el-header>
      <!-- 中间区域 -->
      <el-main>
        <router-view/>
      </el-main>
    </el-container>
  </el-container>
</template>

<style lang="scss" scoped>
.layout-container {
  height: 100vh;
  font-family: 'Noto Sans SC', 'Microsoft YaHei', 'PingFang SC', sans-serif;

  .el-aside {
    position: relative;
    overflow: hidden;
    background: linear-gradient(
      180deg,
      #0a1628 0%,
      #0f2847 20%,
      #1a4a8a 45%,
      #2d7dd2 65%,
      #5ba3e6 85%,
      #a8d5f7 100%
    );

    &::before {
      content: '';
      position: absolute;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      background: radial-gradient(
          circle at 30% 20%,
          rgba(255, 255, 255, 0.06) 0%,
          transparent 50%
        ),
        radial-gradient(
          circle at 70% 60%,
          rgba(255, 255, 255, 0.04) 0%,
          transparent 40%
        ),
        radial-gradient(
          circle at 20% 80%,
          rgba(100, 180, 255, 0.08) 0%,
          transparent 50%
        );
      pointer-events: none;
      z-index: 1;
      animation: aurora 8s ease-in-out infinite alternate;
    }

    &__logo {
      height: 100px;
      background: url('@/assets/logo.png') no-repeat center / 100px auto;
      position: relative;
      z-index: 2;
      margin-top: 10px;
    }

    .el-menu {
      border-right: none;
      background: transparent !important;
      position: relative;
      z-index: 2;

      .el-menu-item {
        margin: 4px 10px;
        border-radius: 10px;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        height: 44px;
        line-height: 44px;

        &:hover {
          background: rgba(255, 255, 255, 0.12) !important;
          transform: translateX(4px);
        }

        &.is-active {
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.2),
            rgba(255, 255, 255, 0.08)
          ) !important;
          box-shadow:
            0 4px 15px rgba(59, 130, 246, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.2);
          color: #fff !important;

          &::before {
            content: '';
            position: absolute;
            left: 0;
            top: 50%;
            transform: translateY(-50%);
            width: 3px;
            height: 20px;
            background: #fff;
            border-radius: 0 3px 3px 0;
            box-shadow: 0 0 8px rgba(255, 255, 255, 0.5);
          }
        }

        .el-icon {
          color: inherit;
        }
      }

      .el-sub-menu {
        .el-sub-menu__title {
          margin: 4px 10px;
          border-radius: 10px;
          transition: all 0.3s ease;
          height: 44px;
          line-height: 44px;

          &:hover {
            background: rgba(255, 255, 255, 0.12) !important;
          }
        }

        .el-menu {
          background: rgba(255, 255, 255, 0.06) !important;
          border-radius: 10px;
          margin: 0 10px 6px;
          padding: 4px 0;

          .el-menu-item {
            margin: 2px 6px;
            padding-left: 48px !important;
          }
        }
      }
    }

    .anime-stars {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 1;

      .star {
        position: absolute;
        color: rgba(255, 255, 255, 0.5);
        font-size: 14px;
        animation: twinkle 3s ease-in-out infinite;
      }

      .star-1 { top: 6%; left: 12%; animation-delay: 0s; font-size: 16px; }
      .star-2 { top: 12%; right: 18%; animation-delay: 0.6s; font-size: 10px; }
      .star-3 { top: 28%; left: 8%; animation-delay: 1.2s; font-size: 12px; }
      .star-4 { top: 42%; right: 12%; animation-delay: 0.3s; font-size: 8px; }
      .star-5 { top: 58%; left: 16%; animation-delay: 1.8s; font-size: 14px; }
      .star-6 { top: 72%; right: 22%; animation-delay: 0.9s; font-size: 11px; }
      .star-7 { top: 85%; left: 10%; animation-delay: 2.2s; font-size: 9px; }
      .star-8 { top: 92%; right: 15%; animation-delay: 1.5s; font-size: 13px; }
    }
  }

  .el-header {
    background: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid rgba(59, 130, 246, 0.08);
    padding: 0 28px;
    height: 60px;
    position: relative;
    z-index: 10;

    .header-left {
      display: flex;
      align-items: center;
      gap: 14px;

      .header-welcome {
        font-size: 14px;
        color: #3b82f6;
        font-weight: 600;
        letter-spacing: 0.5px;
      }

      .header-divider {
        width: 1px;
        height: 18px;
        background: linear-gradient(180deg, transparent, #94a3b8, transparent);
      }

      .header-user {
        font-size: 14px;
        color: #64748b;

        strong {
          color: #1e293b;
          font-weight: 600;
          margin-left: 2px;
        }
      }
    }

    .el-dropdown__box {
      display: flex;
      align-items: center;
      cursor: pointer;
      padding: 4px 10px 4px 6px;
      border-radius: 20px;
      transition: all 0.3s ease;

      &:hover {
        background: rgba(59, 130, 246, 0.08);
        box-shadow: 0 2px 8px rgba(59, 130, 246, 0.1);
      }

      .el-avatar {
        width: 34px;
        height: 34px;
        border: 2px solid #e2e8f0;
        transition: border-color 0.3s ease;
      }

      &:hover .el-avatar {
        border-color: #93c5fd;
      }

      .el-icon {
        color: #94a3b8;
        margin-left: 6px;
        transition: transform 0.3s ease;
      }

      &:hover .el-icon {
        transform: rotate(180deg);
      }

      &:active,
      &:focus {
        outline: none;
      }
    }
  }

  .el-main {
    background: linear-gradient(
      135deg,
      #f8faff 0%,
      #f0f7ff 40%,
      #e8f4fd 70%,
      #f0f7ff 100%
    );
    padding: 20px;
    position: relative;

    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: linear-gradient(
        90deg,
        transparent,
        #3b82f6,
        #60a5fa,
        #93c5fd,
        transparent
      );
      opacity: 0.6;
    }
  }
}

@keyframes twinkle {
  0%, 100% {
    opacity: 0.25;
    transform: scale(0.8) rotate(0deg);
  }
  50% {
    opacity: 1;
    transform: scale(1.2) rotate(180deg);
  }
}

@keyframes aurora {
  0% {
    transform: translate(0, 0) rotate(0deg);
  }
  50% {
    transform: translate(5%, 3%) rotate(2deg);
  }
  100% {
    transform: translate(-3%, -2%) rotate(-1deg);
  }
}
</style>
