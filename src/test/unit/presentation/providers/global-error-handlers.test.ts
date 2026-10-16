import {
  installGlobalErrorHandlers,
  type GlobalErrorHandlerOptions,
} from '../../../../presentation/providers/global-error-handlers';

function createRejectionEvent(reason: Error): Event {
  const event = new Event('unhandledrejection');
  Object.defineProperty(event, 'reason', { value: reason });
  return event;
}

describe('installGlobalErrorHandlers', () => {
  it('captures global error events', () => {
    const onError = jest.fn();
    const options: GlobalErrorHandlerOptions = { onError };

    const uninstall = installGlobalErrorHandlers(options);

    const error = new Error('Global error');
    window.dispatchEvent(new ErrorEvent('error', { error }));

    expect(onError).toHaveBeenCalledWith(error);
    uninstall();
  });

  it('captures unhandled rejection events', () => {
    const onUnhandledRejection = jest.fn();
    const options: GlobalErrorHandlerOptions = { onUnhandledRejection };

    const uninstall = installGlobalErrorHandlers(options);

    const reason = new Error('Unhandled promise rejection');
    window.dispatchEvent(createRejectionEvent(reason));

    expect(onUnhandledRejection).toHaveBeenCalledWith(reason);
    uninstall();
  });

  it('uninstall removes the listeners', () => {
    const addSpy = jest.spyOn(window, 'addEventListener');
    const removeSpy = jest.spyOn(window, 'removeEventListener');

    const cleanup = installGlobalErrorHandlers();

    expect(addSpy).toHaveBeenCalledWith('error', expect.any(Function));
    expect(addSpy).toHaveBeenCalledWith('unhandledrejection', expect.any(Function));

    cleanup();

    expect(removeSpy).toHaveBeenCalledWith('error', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('unhandledrejection', expect.any(Function));

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });
});
