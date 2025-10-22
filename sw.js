// Service Worker for NavHub
const CACHE_NAME = 'navhub-cache-v2' // 更新版本号清理旧缓存
const MAX_CACHE_SIZE = 100 // 最多缓存100个资源
const urlsToCache = [
  '/',
  '/index.html',
  '/fonts/AnJingChenXinShouJinTi.ttf',
  '/fonts/brand.ttf',
  '/fonts/SanJiZhengYaHei-Cu.ttf',
  '/fonts/SanJiZhengYaHei-ZhongCu.ttf',
  '/fonts/SanJiZhengYaHei-Xi.ttf'
]

// 限制缓存大小
async function limitCacheSize(cacheName, maxItems) {
  const cache = await caches.open(cacheName)
  const keys = await cache.keys()
  if (keys.length > maxItems) {
    // 删除最旧的缓存项
    await cache.delete(keys[0])
    await limitCacheSize(cacheName, maxItems)
  }
}

// 安装 Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache)
      })
      .catch((error) => {
        console.error('缓存失败:', error)
      })
  )
})

// 拦截请求
self.addEventListener('fetch', (event) => {
  // 不缓存外部图片资源（AutoIcon 等）
  const url = new URL(event.request.url)
  const isExternalImage = (url.protocol === 'http:' || url.protocol === 'https:') && 
                          url.hostname !== self.location.hostname &&
                          (event.request.destination === 'image' || /\.(png|jpg|jpeg|gif|svg|webp|ico)$/i.test(url.pathname))
  
  if (isExternalImage) {
    // 外部图片直接从网络获取，不缓存
    event.respondWith(fetch(event.request))
    return
  }
  
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // 缓存命中 - 返回缓存的响应
        if (response) {
          return response
        }
        
        // 克隆请求
        const fetchRequest = event.request.clone()
        
        return fetch(fetchRequest).then((response) => {
          // 检查是否是有效的响应
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response
          }
          
          // 克隆响应
          const responseToCache = response.clone()
          
          // 缓存新的响应（异步限制缓存大小）
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache)
              // 限制缓存大小
              limitCacheSize(CACHE_NAME, MAX_CACHE_SIZE)
            })
          
          return response
        })
      })
  )
})

// 清理旧缓存
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME]
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
})

