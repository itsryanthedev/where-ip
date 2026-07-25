import { fireEvent, render } from '@testing-library/react-native';

import { ProviderSelector } from '@/components/provider-selector';

describe('ProviderSelector', () => {
  test('opens a compact menu and reports a new selection', async () => {
    const onSelect = jest.fn();

    const { getByRole, queryByRole } = await render(
      <ProviderSelector selectedProvider="ipinfo" onSelect={onSelect} />,
    );

    const trigger = getByRole('button', { name: 'Provider, IPinfo' });
    expect(
      trigger.props.accessibilityState,
    ).toEqual({ expanded: false });
    expect(queryByRole('radio', { name: 'Use IPinfo' })).toBeNull();

    await fireEvent.press(trigger);

    expect(
      getByRole('radio', { name: 'Use IPinfo' }).props.accessibilityState,
    ).toEqual({ checked: true });
    await fireEvent.press(getByRole('radio', { name: 'Use FreeIPAPI' }));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith('freeipapi');
    expect(queryByRole('radio', { name: 'Use IPinfo' })).toBeNull();
  });

  test('shows official privacy links for the selected provider', async () => {
    const { getByRole, getByText, queryByRole } = await render(
      <ProviderSelector selectedProvider="ipinfo" onSelect={jest.fn()} />,
    );

    const policiesButton = getByRole('button', {
      name: 'Privacy and terms for IPinfo',
    });
    expect(policiesButton.props.accessibilityState).toEqual({
      expanded: false,
    });

    await fireEvent.press(policiesButton);

    expect(getByText('IPinfo privacy')).toBeTruthy();
    expect(getByRole('link', { name: 'IPinfo Privacy Policy' })).toBeTruthy();
    expect(getByRole('link', { name: 'IPinfo Terms of Use' })).toBeTruthy();
    expect(
      getByRole('link', { name: 'IPinfo API documentation' }),
    ).toBeTruthy();
    expect(queryByRole('radio', { name: 'Use IPinfo' })).toBeNull();
  });

  test('dismisses an open menu when the outside layer is pressed', async () => {
    const { getByRole, queryByRole } = await render(
      <ProviderSelector selectedProvider="ipinfo" onSelect={jest.fn()} />,
    );

    await fireEvent.press(getByRole('button', { name: 'Provider, IPinfo' }));
    expect(getByRole('radio', { name: 'Use IPinfo' })).toBeTruthy();

    await fireEvent.press(
      getByRole('button', { name: 'Dismiss provider menu' }),
    );
    expect(queryByRole('radio', { name: 'Use IPinfo' })).toBeNull();
  });

  test('shows when a provider-switch refresh is waiting or running', async () => {
    const { getByText, rerender } = await render(
      <ProviderSelector
        selectedProvider="freeipapi"
        onSelect={jest.fn()}
        providerSwitchTarget="freeipapi"
        providerSwitchRemainingMs={37_200}
      />,
    );

    expect(getByText('Updating with FreeIPAPI in 38s')).toBeTruthy();

    await rerender(
      <ProviderSelector
        selectedProvider="freeipapi"
        onSelect={jest.fn()}
        providerSwitchTarget="freeipapi"
        providerSwitchRefreshing
      />,
    );

    expect(getByText('Updating with FreeIPAPI…')).toBeTruthy();
  });
});
