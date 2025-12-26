<script lang="ts" setup>
import { Slot } from "reka-ui";
import { useFormField } from "./useFormField";

const { error, formItemId, formDescriptionId, formMessageId } =
  useFormField();
</script>

<template>
  <slot
    :id="formItemId"
    data-slot="form-control"
    :aria-describedby="!error ? `${formDescriptionId}` : `${formDescriptionId} ${formMessageId}`"
    :aria-invalid="!!error"
  >
    <slot />
  </slot>
</template>
