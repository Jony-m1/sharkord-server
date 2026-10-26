import {
  createContext,
  useContext,
  type Dispatch,
  type SetStateAction
} from 'react';

export type TSettingsFormHandle = {
  isDirty: boolean;
  isSaving: boolean;
  save: () => Promise<void>;
  discard: () => void;
};

type TSettingsFormSlot = Dispatch<SetStateAction<TSettingsFormHandle | null>>;

const noop: TSettingsFormSlot = () => {};

const SettingsFormContext = createContext<TSettingsFormSlot>(noop);

const useSettingsFormSlot = () => useContext(SettingsFormContext);

export { SettingsFormContext, useSettingsFormSlot };
