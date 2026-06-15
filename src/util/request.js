import axios from "axios";
const baseURL='/api';
const instance = axios.create({baseURL});
import { ElMessage } from 'element-plus'
import {useTokenStore} from "@/stores/token.js";
//请求拦截器
instance.interceptors.request.use(
    (config)=>{
        let tokenStore=useTokenStore();
        if (tokenStore.token){
            config.headers.Authorization = tokenStore.token
        }
        return config
    },
(err)=>{
        Promise.reject(err)
}
)
import router from '@/router/index.js';
//添加响应拦截器
instance.interceptors.response.use(
    result=>{
        if (result.data.code===0){
            return result.data;
        }
        // alert(result.data.msg? result.data.msg:'服务异常')
        ElMessage.error(result.data.message? result.data.message:'服务异常')
        return Promise.reject(result.data)
    },
    err=>{
        //判断相应状态码
        if (err.response.status===401){
            ElMessage.error('请登录')
            router.push('/login')
        }else {
            ElMessage.error('服务异常')
        }
        return Promise.reject(err);
    }
)
export default instance;