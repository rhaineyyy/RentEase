import { computed, nextTick, ref, type Ref } from 'vue';

type ScrollHost = { $el?: { getScrollElement?: () => Promise<HTMLElement> } };

type Frame<T extends string> = {
  section: T;
  scrollTop: number;
  restore?: () => void;
};

export function useSectionReturn<T extends string>(
  section: Ref<T>,
  labels: Record<string, string>,
  scroller: Ref<ScrollHost | null>,
) {
  const stack = ref<Frame<T>[]>([]) as Ref<Frame<T>[]>;

  const backLabel = computed(() => {
    const frame = stack.value[stack.value.length - 1] as Frame<T> | undefined;
    if (!frame) return '';
    return `Back to ${labels[frame.section] || 'previous section'}`;
  });

  async function currentScroll() {
    const host = scroller.value?.$el;
    if (!host?.getScrollElement) return 0;
    const element = await host.getScrollElement();
    return element?.scrollTop ?? 0;
  }

  async function scrollTo(top: number) {
    await nextTick();
    await nextTick();
    const host = scroller.value?.$el;
    if (!host?.getScrollElement) return;
    const element = await host.getScrollElement();
    if (element) element.scrollTop = top;
  }

  async function remember(restore?: () => void) {
    stack.value.push({
      section: section.value,
      scrollTop: await currentScroll(),
      restore,
    });
  }

  function clearReturn() {
    stack.value = [];
  }

  function previousSection() {
    return (stack.value[stack.value.length - 1] as Frame<T> | undefined)?.section ?? null;
  }

  async function goBack() {
    const frame = stack.value.pop() as Frame<T> | undefined;
    if (!frame) return false;
    section.value = frame.section;
    frame.restore?.();
    await scrollTo(frame.scrollTop);
    return true;
  }

  return { backLabel, remember, clearReturn, previousSection, goBack, scrollTo };
}
