<template>
  <section class="section">
    <Menu />
    <PostsList :posts="posts" />
    <Footer />
  </section>
</template>

<script>
export default {
  async asyncData({ $content, params }) {
    const posts = await $content('', params.slug)
      .only(['title', 'description', 'img', 'slug', 'author', 'date', 'tags'])
      .sortBy('createdAt', 'asc')
      .fetch()

    return {
      posts,
    }
  },
}
</script>

<style>
.section {
  padding: 0;
}
</style>
