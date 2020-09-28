<template>
  <section class="section mx-1">
    <Menu />
    <div class="columns">
      <div class="column is-10-desktop is-offset-1-desktop">
        <div class="columns">
          <div class="column is-3-desktop is-3-tablet is-12-mobile mt-5">
            <SidePanel :side="side" :posts="posts" />
          </div>
          <div class="column is-9-desktop">
            <PostsList :posts="posts" />
          </div>
        </div>
      </div>
    </div>
    <Footer />
  </section>
</template>

<script>
export default {
  async asyncData({ $content, params, query }) {
    const posts = await $content('')
      .where(query.tag == null ? {} : { tags: { $contains: query.tag } })
      .only(['title', 'description', 'img', 'slug', 'author', 'date', 'tags'])
      .sortBy('createdAt', 'asc')
      .fetch()
    const side = await $content('more/side').fetch()

    return {
      posts,
      side,
    }
  },
  methods: {
    formatDate(date) {
      const options = { year: 'numeric', month: 'long', day: 'numeric' }
      return new Date(date).toLocaleDateString('en', options)
    },
  },
}
</script>

<style>
.section {
  padding: 0;
}
</style>
