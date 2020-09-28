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
    const post = await $content(params.slug).fetch()

    return { post }
  },
}
</script>
