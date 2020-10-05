<template>
  <div>
    You have reached the forbidden Zone.
    Turn around before its too late.
  </div>
</template>

<script>
export default {
    name: "ErrorView",
    data(): { hello: number } {
        return {
            hello: 1
        };
    },
    mounted(): void {
        console.log("errorView mounted");
    }
}
</script>

<style scoped>

</style>
