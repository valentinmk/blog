<template>
  <section class="section">
    <Menu />
    <PostContent :post="post" />
    <Footer />
  </section>
</template>

<script>
export default {
  async asyncData({ $content, params }) {
    const post = await $content('more/about').fetch()

    return { post }
  },
  methods: {
    formatDate(date) {
      const options = { year: 'numeric', month: 'long', day: 'numeric' }
      return new Date(date).toLocaleDateString('en', options)
    },
  },
}
</script>
