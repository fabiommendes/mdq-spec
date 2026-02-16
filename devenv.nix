{ pkgs, lib, config, ... }: {
  # https://devenv.sh/languages/
  languages = {
    typescript.enable = true;
    javascript = {
      enable = true;
      npm.enable = true;
    };
  };

  cachix.enable = false;
  env.PATH = [ ./scripts ];

  # See full reference at https://devenv.sh/reference/options/
}
