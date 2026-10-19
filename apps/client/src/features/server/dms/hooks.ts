import type { IRootState } from '@/features/store';
import { useSelector } from 'react-redux';
import {
  directMessageUserIdByChannelIdSelector,
  visibleDirectMessagesSelector
} from './selectors';

export const useVisibleDirectMessages = () =>
  useSelector(visibleDirectMessagesSelector);

export const useDirectMessageUserId = (channelId: number) =>
  useSelector((state: IRootState) =>
    directMessageUserIdByChannelIdSelector(state, channelId)
  );
