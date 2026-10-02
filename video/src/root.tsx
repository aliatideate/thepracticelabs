import { Composition, Folder } from "remotion";
import { FacilitatorView } from "./compositions/FacilitatorView";

export const RemotionRoot = () => {
  return (
    <>
      <Folder name="Practice-Labs">
        <Composition
          id="FacilitatorView-16x9"
          component={FacilitatorView}
          width={1920}
          height={1080}
          fps={30}
          durationInFrames={900}
          defaultProps={{ layout: "wide" }}
        />
        <Composition
          id="FacilitatorView-1x1"
          component={FacilitatorView}
          width={1080}
          height={1080}
          fps={30}
          durationInFrames={900}
          defaultProps={{ layout: "square" }}
        />
      </Folder>
    </>
  );
};
