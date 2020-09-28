<template>
  <nav class="panel">
    <div class="panel-block">
      <p class="control has-icons-left">
        <input
          v-model="searchQuery"
          type="search"
          autocomplete="off"
          placeholder="Don't setup real search engne like algola, I don't think that a number of article will be overhelming"
          class="input"
          label="search"
        />
        <span class="icon is-left">
          <i class="fas fa-search" aria-hidden="true"></i>
        </span>
      </p>
    </div>
    <NuxtLink
      v-for="post of posts"
      :key="post.slug"
      :to="{ name: 'posts-slug', params: { slug: post.slug } }"
      class="panel-block is-active"
    >
      {{ post.title }}
    </NuxtLink>
  </nav>
</template>

<script>
export default {
  data() {
    return {
      searchQuery: '',
      posts: [],
    }
  },
  watch: {
    async searchQuery(searchQuery) {
      if (!searchQuery) {
        this.posts = []
        return
      }
      this.posts = await this.$content('').limit(6).search(searchQuery).fetch()
    },
  },
}
</script>
