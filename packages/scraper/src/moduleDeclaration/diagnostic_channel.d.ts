/**
 * @experimental
 */
declare module "diagnostics_channel" {
  /**
   * Check if there are active subscribers to the named channel.
   * This is helpful if the message you want to send might be expensive to prepare.
   *
   * This API is optional but helpful when trying to publish messages from very performance-sensitive code.
   */
  function hasSubscribers(name: string | symbol): boolean;

  /**
   * This is the primary entry-point for anyone wanting to interact with a named channel.
   * It produces a channel object which is optimized to reduce overhead at publish time as much as possible.
   */
  function channel(name: string | symbol): Channel;

  type ChannelListener = (name: string | symbol, message: unknown) => void;

  /**
   * Simple diagnostic channel that allows
   */
  class Channel {
    public readonly name: string;
    public readonly hasSubscribers: boolean;

    private constructor(name: string);

    /**
     * Register a message handler to subscribe to this channel.
     * This message handler will be run synchronously whenever a message is published to the channel.
     * Any errors thrown in the message handler will trigger an 'uncaughtException'.
     */
    public subscribe(listener: ChannelListener): void;

    /**
     * Remove a message handler previously registered to this channel with channel.subscribe(onMessage).
     */
    public unsubscribe(listener: ChannelListener): void;

    /**
     * Publish a message to any subscribers to the channel.
     * This will trigger message handlers synchronously so they will execute within the same context.
     *
     * @param message The message to send to the channel subscribers
     */
    public publish(message: unknown);
  }
}
