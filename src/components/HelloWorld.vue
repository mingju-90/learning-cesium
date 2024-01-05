<template>
  <div class="wrap">
    <!-- Your HTML code here -->
    
    <List :data-source="routes">
      <template #renderItem="{item}">
        <ListItem>
          <ListItemMeta :description="item.description">
            <template #title>
              <router-link :to="{name: item.name}">{{ item.name }}</router-link>
            </template>
          </ListItemMeta>
        </ListItem>
      </template>
    </List>
  </div>
</template>

<script setup>
// 引入所需的响应式函数和钩子函数
import { ref, reactive } from 'vue';
import {routes} from '../router/index'
import { List, ListItem, ListItemMeta } from 'ant-design-vue';
console.log(routes)

</script>

<style scoped>
.wrap {
  /* Your styles here */
  padding: 20px;
}
</style>