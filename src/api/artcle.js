import request from "@/util/request.js";
import {useTokenStore} from "@/stores/token.js"
//获得所有笔记分类数据
export const articleCategoryListService=()=>{
   // const tokenStore=useTokenStore();
    // return request.get('/category',{headers:{'Authorization':tokenStore.token}})
   return request.get('/category')
}
//添加分类
export const articleCategoryAddService=(categoryData)=>{
return request.post('/category',categoryData)
}
//编辑分类
export const articleCategoryUpdateService=(categoryData)=>{
  return  request.put('/category',categoryData)
}
//删除分类
export const articleCategoryDeleteService=(id)=>{
   return  request.delete('/category?id='+id)
}
//笔记列表查询
export const articleListService=(params)=>{
  return  request.get('/article',{params: params})
}
//添加笔记
export const articleAddService=(articleData)=>{
  return   request.post('/article',articleData);
}
//删除笔记
export const articleDeleteService=(id)=>{
    return request.delete('/article?id='+id)
}
//更新笔记
export const articleUpdateService=(articleData)=>{
   return  request.put('/article',articleData)
}